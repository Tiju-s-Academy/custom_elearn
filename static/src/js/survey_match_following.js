/**
 * Match Following Component for Surveys
 * Vanilla JS implementation with no module dependencies
 */
(function() {
    'use strict';
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Match Following: Document ready');
        setTimeout(initMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        console.log('Match Following: Initializing');
        
        // Check if we're on a survey page
        if (!document.querySelector('.o_survey_form')) {
            console.log('Match Following: Not on a survey page');
            return;
        }
        
        // Add CSS styles
        addStyles();
        
        // Process all match following containers
        var containers = document.querySelectorAll('.o_survey_match_following_wrapper');
        console.log(`Match Following: Found ${containers.length} containers`);
        
        containers.forEach(function(container) {
            processMatchFollowingContainer(container);
        });
        
        // Monitor for dynamically added questions
        setupMutationObserver();
    }
    
    // Process a match following container
    function processMatchFollowingContainer(container) {
        // Skip if already processed
        if (container.hasAttribute('data-processed')) {
            return;
        }
        
        console.log('Match Following: Processing container');
        
        // Get question ID
        var questionId = container.getAttribute('data-question-id');
        if (!questionId) {
            console.error('Match Following: No question ID found on container');
            return;
        }
        
        // Add sample items (in a real implementation, these would come from the server)
        addSampleItems(container, questionId);
        
        // Setup drag and drop
        setupDragAndDrop(container);
        
        // Mark as processed
        container.setAttribute('data-processed', 'true');
    }
    
    // Add sample items to container
    function addSampleItems(container, questionId) {
        var leftContainer = container.querySelector('.o_match_questions');
        var rightContainer = container.querySelector('.o_match_answers');
        
        if (!leftContainer || !rightContainer) {
            console.error('Match Following: Could not find question or answer containers');
            return;
        }
        
        // Sample items
        var pairs = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        // Add left items
        pairs.forEach(function(pair) {
            var item = document.createElement('div');
            item.className = 'o_match_item mb-2 p-2 border rounded bg-white';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-pair-id', pair.id);
            item.textContent = pair.left;
            leftContainer.appendChild(item);
        });
        
        // Add right items (shuffled)
        shuffle(pairs).forEach(function(pair) {
            var item = document.createElement('div');
            item.className = 'o_match_item mb-2 p-2 border rounded bg-white';
            item.setAttribute('data-pair-id', pair.id);
            item.textContent = pair.right;
            rightContainer.appendChild(item);
        });
    }
    
    // Setup drag and drop functionality
    function setupDragAndDrop(container) {
        // Setup drag for left items
        var leftItems = container.querySelectorAll('.o_match_questions .o_match_item');
        for (var i = 0; i < leftItems.length; i++) {
            var item = leftItems[i];
            
            // Drag start
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            });
            
            // Drag end
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                this.style.opacity = '';
                
                var activeDropZones = document.querySelectorAll('.drop-active');
                for (var j = 0; j < activeDropZones.length; j++) {
                    activeDropZones[j].classList.remove('drop-active');
                }
            });
        }
        
        // Setup drop for right items
        var rightItems = container.querySelectorAll('.o_match_answers .o_match_item');
        for (var k = 0; k < rightItems.length; k++) {
            var target = rightItems[k];
            
            // Allow drops
            target.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-active');
            });
            
            // Reset styling
            target.addEventListener('dragleave', function() {
                this.classList.remove('drop-active');
            });
            
            // Handle drop
            target.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-active');
                
                var pairId = e.dataTransfer.getData('text/plain');
                if (!pairId) return;
                
                // Check if correct match
                if (this.getAttribute('data-pair-id') === pairId) {
                    // Correct match
                    this.classList.add('matched');
                    this.style.backgroundColor = '#d4edda';
                    this.style.borderColor = '#c3e6cb';
                    
                    // Find and mark left item
                    var leftItem = container.querySelector('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        leftItem.classList.add('matched');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                        leftItem.setAttribute('data-matched', 'true');
                    }
                    
                    // Save match
                    saveMatches(container);
                } else {
                    // Wrong match - show feedback
                    this.style.backgroundColor = '#f8d7da';
                    this.style.borderColor = '#f5c6cb';
                    
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = '';
                        self.style.borderColor = '';
                    }, 1000);
                }
            });
        }
    }
    
    // Save matches to server
    function saveMatches(container) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.log('Match Following: Missing question ID or survey token');
            return;
        }
        
        // Collect matched items
        var matches = [];
        var matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        }
        
        // Update hidden input if it exists
        var input = document.querySelector('input[name="question_' + questionId + '"]');
        if (input) {
            input.value = JSON.stringify(matches);
        } else {
            // Create a hidden input if it doesn't exist
            var hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'question_' + questionId;
            hiddenInput.value = JSON.stringify(matches);
            container.appendChild(hiddenInput);
        }
        
        // Send to server
        submitMatches(surveyToken, questionId, matches);
        
        // Update UI
        updateStatus(container, matches.length);
    }
    
    // Submit matches to server
    function submitMatches(surveyToken, questionId, matches) {
        console.log('Match Following: Submitting matches to server');
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Match Following: Submission successful');
                } else {
                    console.error('Match Following: Submission failed with status ' + xhr.status);
                }
            }
        };
        
        var data = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: matches
            },
            id: new Date().getTime()
        };
        
        xhr.send(JSON.stringify(data));
    }
    
    // Update status display
    function updateStatus(container, matchCount) {
        var statusElem = container.querySelector('.match-status');
        if (!statusElem) return;
        
        var totalItems = container.querySelectorAll('.left-items .match-item').length;
        
        if (matchCount === totalItems) {
            // All items matched correctly
            statusElem.innerHTML = '<div class="alert alert-success py-2">All items matched correctly!</div>';
            
            // Find next button
            var nextBtn = document.querySelector('.o_survey_form button[type="submit"]');
            if (nextBtn) {
                nextBtn.focus();
            }
        } else {
            // Show progress
            statusElem.innerHTML = '<div class="text-muted">' + matchCount + ' of ' + totalItems + ' items matched</div>';
        }
    }
    
    // Get question ID from element
    function getQuestionId(questionElem) {
        // Try data attribute
        var id = questionElem.getAttribute('data-question-id');
        if (id) return id;
        
        // Try element ID
        if (questionElem.id && questionElem.id.match(/survey_question_(\d+)/)) {
            return questionElem.id.match(/survey_question_(\d+)/)[1];
        }
        
        // Try input name
        var inputs = questionElem.querySelectorAll('input[name^="question_"]');
        for (var i = 0; i < inputs.length; i++) {
            var match = inputs[i].name.match(/question_(\d+)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // Generate random ID
        return 'q_' + Math.floor(Math.random() * 10000);
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/);
                    
        if (match && match[1]) {
            return match[1];
        }
        
        // Try to find token input
        var tokenInput = document.querySelector('input[name="token"]');
        if (tokenInput) {
            return tokenInput.value;
        }
        
        return null;
    }
    
    // Setup observer to watch for dynamically added questions
    function setupMutationObserver() {
        var target = document.querySelector('.o_survey_form_content');
        if (!target) return;
        
        var observer = new MutationObserver(function(mutations) {
            var shouldCheck = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                setTimeout(findAndProcessQuestions, 500);
            }
        });
        
        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }
    
    // Add CSS styles
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = `
            .o_survey_match_following_wrapper {
                margin: 15px 0;
                padding: 15px;
                background-color: #f9f9fa;
                border-radius: 4px;
            }
            .o_match_questions,
            .o_match_answers {
                min-height: 150px;
                padding: 10px;
                border: 1px dashed #ccc;
                border-radius: 4px;
                background-color: #fff;
                margin-bottom: 10px;
            }
            .o_match_item {
                transition: all 0.2s ease;
                cursor: pointer;
                padding: 10px;
                margin: 5px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #fff;
            }
            .o_match_questions .o_match_item {
                cursor: grab;
            }
            .o_match_item.matched {
                background-color: #d4edda !important;
                border-color: #c3e6cb !important;
            }
            .drop-active {
                background-color: #e8f4ff !important;
                border-color: #b8daff !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Shuffle array
    function shuffle(array) {
        var result = array.slice();
        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    }
})();