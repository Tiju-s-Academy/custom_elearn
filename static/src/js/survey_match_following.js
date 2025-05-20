/**
 * Vanilla JavaScript implementation for match following questions
 * This avoids dependency issues with the Odoo module system
 */
(function() {
    'use strict';

    // Wait for the DOM to load
    document.addEventListener('DOMContentLoaded', function() {
        setupMatchFollowing();
    });

    // Set up the match following functionality
    function setupMatchFollowing() {
        console.log("Setting up match following...");
        
        // Find all match following containers
        const containers = document.querySelectorAll('.match_following_container');
        if (containers.length === 0) {
            console.log("No match following containers found");
            return;
        }

        console.log("Found match following containers:", containers.length);
        
        // Initialize each container
        containers.forEach(function(container) {
            initContainer(container);
        });
    }

    // Initialize a single match following container
    function initContainer(container) {
        // Set up drag and drop
        const items = container.querySelectorAll('.o_match_item');
        items.forEach(function(item) {
            item.setAttribute('draggable', true);
            
            // Add event listeners for drag and drop
            item.addEventListener('dragstart', onDragStart);
            item.addEventListener('dragend', onDragEnd);
        });

        // Add event listeners to drop zones
        const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        dropZones.forEach(function(zone) {
            zone.addEventListener('dragover', onDragOver);
            zone.addEventListener('dragleave', onDragLeave);
            zone.addEventListener('drop', onDrop);
        });

        // Load any stored answers
        loadStoredAnswers(container);
    }

    // Load stored answers if available
    function loadStoredAnswers(container) {
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (!hiddenInput || !hiddenInput.value) return;

        try {
            const matches = JSON.parse(hiddenInput.value);
            matches.forEach(function(match) {
                const pairId = match.pair_id;
                if (pairId) {
                    const item = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    if (item) {
                        item.setAttribute('data-matched', 'true');
                        item.classList.add('matched');
                    }
                }
            });
        } catch (e) {
            console.error("Failed to load stored matches", e);
        }
    }

    // Event handler for drag start
    function onDragStart(e) {
        e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
        this.classList.add('dragging');
    }

    // Event handler for drag over
    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drop-zone-active');
    }

    // Event handler for drag leave
    function onDragLeave(e) {
        this.classList.remove('drop-zone-active');
    }

    // Event handler for drag end
    function onDragEnd(e) {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.drop-zone-active').forEach(el => el.classList.remove('drop-zone-active'));
    }

    // Event handler for drop
    function onDrop(e) {
        e.preventDefault();
        const container = findClosestContainer(this);
        if (!container) return;
        
        const pairId = e.dataTransfer.getData('text/plain');
        const target = this;
        
        // Handle dropping in answer column
        if (target.classList.contains('o_match_answers')) {
            // Mark the question item as matched
            const questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
            if (questionItem) {
                questionItem.setAttribute('data-matched', 'true');
                questionItem.classList.add('matched');
            }
            
            // Remove existing highlight
            container.querySelectorAll(`.o_match_answers .matched-with-${pairId}`).forEach(el => {
                el.classList.remove(`matched-with-${pairId}`);
            });
            
            // Highlight the answer item
            const answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
            if (answerItem) {
                answerItem.classList.add('matched');
                answerItem.classList.add(`matched-with-${pairId}`);
            }
        }
        
        // Update the matches in the hidden input
        updateMatches(container);
        
        // Remove any drag and drop styling
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        target.classList.remove('drop-zone-active');
    }

    // Update the matches in the hidden input
    function updateMatches(container) {
        const matches = [];
        
        // Collect all matched pairs
        container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]').forEach(function(item) {
            const pairId = item.getAttribute('data-pair-id');
            matches.push({
                pair_id: pairId,
                matched: true
            });
        });
        
        // Update the hidden input
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(matches);
            
            // Trigger a change event for form handling
            const event = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(event);
            
            // Submit the answer to the server directly
            submitAnswerToServer(container, matches);
        }
    }

    // Submit the answer directly to the server
    function submitAnswerToServer(container, matches) {
        // Find the form wrapper to get the question ID
        const formWrapper = findFormWrapper(container);
        if (!formWrapper) return;
        
        // Get either the question ID from the element or from the page URL
        let questionId = container.getAttribute('data-question-id') || 
                         formWrapper.getAttribute('data-question-id');
                         
        // Try to extract question ID from the hidden input name
        if (!questionId) {
            const hiddenInput = container.querySelector('input[type="hidden"]');
            if (hiddenInput && hiddenInput.name) {
                const nameMatch = hiddenInput.name.match(/question_(\d+)/);
                if (nameMatch) {
                    questionId = nameMatch[1];
                }
            }
        }
        
        // If we still don't have a question ID, get it from the page context
        if (!questionId) {
            // For Odoo 17, try to find question ID in context
            const surveyForm = document.querySelector('.o_survey_form');
            if (surveyForm) {
                // Often in Odoo 17 the question ID is embedded in the form data 
                const questionInputs = surveyForm.querySelectorAll('input[name^="question_"]');
                if (questionInputs.length > 0) {
                    // Extract question ID from input name (e.g., "question_123")
                    const inputName = questionInputs[0].name;
                    const idMatch = inputName.match(/question_(\d+)/);
                    if (idMatch) {
                        questionId = idMatch[1];
                    }
                }
            }
        }
        
        // Get the survey token from the URL
        const url = window.location.href;
        const tokenMatch = url.match(/\/survey\/([^\/]+)/);
        const surveyToken = tokenMatch ? tokenMatch[1] : null;
        
        if (!surveyToken) {
            console.error("Could not find survey token in URL");
            return;
        }
        
        if (!questionId) {
            console.error("Could not determine question ID");
            return;
        }
        
        console.log(`Submitting match following answer for question ${questionId} in survey ${surveyToken}`);
        
        // Make the AJAX request to the server
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/survey/submit/${surveyToken}/${questionId}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.result && response.result.length > 0) {
                            console.log('Answer submitted successfully:', response.result);
                        } else {
                            console.warn('Empty response from server:', response);
                        }
                    } catch (e) {
                        console.error('Error parsing response:', e);
                    }
                } else {
                    console.error('Error submitting answer:', xhr.status, xhr.statusText);
                }
            }
        };
        
        // Make sure to format the request properly for Odoo's JSON-RPC
        xhr.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
                value_match_following: JSON.stringify(matches),
                csrf_token: getCsrfToken()
            },
            id: new Date().getTime()
        }));
    }

    // Helper function to get CSRF token
    function getCsrfToken() {
        // Try to get it from the cookie
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('csrf_token=')) {
                return cookie.substring('csrf_token='.length);
            }
        }
        
        // Try to get it from a meta tag
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        
        return '';
    }

    // Find the form wrapper for a container
    function findFormWrapper(element) {
        let current = element;
        while (current && !current.classList.contains('js_question-wrapper')) {
            current = current.parentElement;
        }
        return current;
    }

    // Find the closest match following container to an element
    function findClosestContainer(element) {
        let current = element;
        while (current && !current.classList.contains('match_following_container')) {
            current = current.parentElement;
        }
        return current;
    }

    // Add this code to the window for Odoo compatibility attempts
    window.customElearnMatchFollowing = {
        setup: setupMatchFollowing
    };
})();