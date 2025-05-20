odoo.define('custom_elearn.match_following', function (require) {
'use strict';

var publicWidget = require('web.public.widget');

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.match_following_container',
    
    start: function () {
        this._setupDragDrop();
        return this._super.apply(this, arguments);
    },
    
    _setupDragDrop: function() {
        var self = this;
        
        // Make items draggable
        this.$('.o_match_item').attr('draggable', true);
        
        // Drag events
        this.$('.o_match_item').on('dragstart', function(e) {
            e.originalEvent.dataTransfer.setData('text/plain', $(this).data('pair-id'));
            $(this).addClass('dragging');
        });
        
        this.$('.o_match_item').on('dragend', function() {
            $('.dragging').removeClass('dragging');
            $('.drop-zone-active').removeClass('drop-zone-active');
        });
        
        // Drop zone events
        this.$('.o_match_questions, .o_match_answers').on('dragover', function(e) {
            e.preventDefault();
            $(this).addClass('drop-zone-active');
        });
        
        this.$('.o_match_questions, .o_match_answers').on('dragleave', function() {
            $(this).removeClass('drop-zone-active');
        });
        
        this.$('.o_match_questions, .o_match_answers').on('drop', function(e) {
            e.preventDefault();
            var pairId = e.originalEvent.dataTransfer.getData('text/plain');
            
            if ($(this).hasClass('o_match_answers')) {
                // Match the item
                self.$('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]')
                    .attr('data-matched', 'true')
                    .addClass('matched');
                
                // Update input value
                self._updateMatchesInput();
            }
            
            // Clean up
            $('.dragging').removeClass('dragging');
            $(this).removeClass('drop-zone-active');
        });
    },
    
    _updateMatchesInput: function() {
        var matches = [];
        
        this.$('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
            matches.push({
                pair_id: $(this).data('pair-id'),
                matched: true
            });
        });
        
        this.$('input[type="hidden"]').val(JSON.stringify(matches));
    }
});

/**
 * Match Following Questions for Odoo Surveys
 * 
 * This script implements drag and drop functionality for match following questions
 */
(function() {
    'use strict';

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: DOM loaded");
        setTimeout(initializeMatchFollowing, 500);
    });

    // Initialize match following functionality
    function initializeMatchFollowing() {
        console.log("Match Following: Initializing");
        
        // Try to find our container
        let containers = document.querySelectorAll('.match_following_container');
        
        // If not found, try to detect match following questions and inject UI
        if (containers.length === 0) {
            injectMatchFollowingUI();
            
            // Re-check for containers after injection
            containers = document.querySelectorAll('.match_following_container');
        }
        
        // Set up each container
        containers.forEach(setupDragDrop);
        
        console.log(`Match Following: Found ${containers.length} containers`);
    }
    
    // Find match following questions and inject UI
    function injectMatchFollowingUI() {
        console.log("Match Following: Looking for questions to inject UI");
        
        // Find question wrappers in the survey
        const questionWrappers = document.querySelectorAll('.js_question-wrapper, .o_survey_form .js_question');
        
        questionWrappers.forEach(function(wrapper) {
            // Check if this is a match following question
            let questionId = wrapper.getAttribute('data-question-id');
            let questionType = '';
            
            // Try to find question type
            const typeInput = wrapper.querySelector('input[name="question_type"]');
            if (typeInput) {
                questionType = typeInput.value;
            }
            
            // If no ID found, try to extract from inputs
            if (!questionId) {
                const inputs = wrapper.querySelectorAll('input[name^="question_"]');
                if (inputs.length > 0) {
                    const nameMatch = inputs[0].name.match(/question_(\d+)/);
                    if (nameMatch && nameMatch[1]) {
                        questionId = nameMatch[1];
                    }
                }
            }
            
            // Create UI if this is a match following question
            if (questionType === 'match_following' || questionId) {
                createMatchFollowingUI(wrapper, questionId);
            }
        });
    }
    
    // Create match following UI for a question
    function createMatchFollowingUI(wrapper, questionId) {
        console.log(`Match Following: Creating UI for question ${questionId}`);
        
        // Create container div
        const container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create content with rows and columns
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Items</h5>
                    <div class="o_match_questions p-3 border rounded" style="min-height:150px;"></div>
                </div>
                <div class="col-md-6">
                    <h5>Match With</h5>
                    <div class="o_match_answers p-3 border rounded" style="min-height:150px;"></div>
                </div>
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
            <p class="text-muted small mt-2">Drag items from left to right to match them correctly.</p>
        `;
        
        // Append to wrapper
        wrapper.appendChild(container);
        
        // Add sample pairs for testing
        addSamplePairs(container, questionId);
        
        return container;
    }
    
    // Add sample pairs for testing
    function addSamplePairs(container, questionId) {
        console.log(`Match Following: Adding sample pairs for question ${questionId}`);
        
        const pairs = [
            { id: `pair_1_${questionId}`, left: 'Apple', right: 'Fruit' },
            { id: `pair_2_${questionId}`, left: 'Dog', right: 'Animal' },
            { id: `pair_3_${questionId}`, left: 'Car', right: 'Vehicle' }
        ];
        
        const leftZone = container.querySelector('.o_match_questions');
        const rightZone = container.querySelector('.o_match_answers');
        
        if (leftZone && rightZone) {
            // Create left items
            pairs.forEach(function(pair) {
                const leftItem = document.createElement('div');
                leftItem.className = 'o_match_item mb-2 p-2 bg-white border rounded';
                leftItem.setAttribute('draggable', 'true');
                leftItem.setAttribute('data-pair-id', pair.id);
                leftItem.textContent = pair.left;
                leftZone.appendChild(leftItem);
                
                const rightItem = document.createElement('div');
                rightItem.className = 'o_match_item mb-2 p-2 bg-white border rounded';
                rightItem.setAttribute('draggable', 'true');
                rightItem.setAttribute('data-pair-id', pair.id);
                rightItem.textContent = pair.right;
                rightZone.appendChild(rightItem);
            });
        }
    }
    
    // Set up drag and drop functionality
    function setupDragDrop(container) {
        console.log(`Match Following: Setting up drag and drop for container`);
        
        // Get all match items
        const items = container.querySelectorAll('.o_match_item');
        
        // Make them draggable
        items.forEach(function(item) {
            // If already initialized, skip
            if (item.getAttribute('data-initialized')) return;
            
            // Mark as initialized
            item.setAttribute('data-initialized', 'true');
            
            // Drag start
            item.addEventListener('dragstart', function(e) {
                console.log('Match Following: Drag started');
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
            });
            
            // Drag end
            item.addEventListener('dragend', function() {
                console.log('Match Following: Drag ended');
                this.classList.remove('dragging');
                container.querySelectorAll('.drop-zone-active').forEach(function(el) {
                    el.classList.remove('drop-zone-active');
                });
            });
        });
        
        // Set up drop zones
        const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        
        dropZones.forEach(function(zone) {
            // If already initialized, skip
            if (zone.getAttribute('data-initialized')) return;
            
            // Mark as initialized
            zone.setAttribute('data-initialized', 'true');
            
            // Drag over
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
            });
            
            // Drag leave
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            // Drop
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                console.log('Match Following: Item dropped');
                
                const pairId = e.dataTransfer.getData('text/plain');
                
                if (this.classList.contains('o_match_answers')) {
                    const questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    if (questionItem) {
                        questionItem.setAttribute('data-matched', 'true');
                        questionItem.style.backgroundColor = '#d4edda';
                        questionItem.style.borderColor = '#c3e6cb';
                    }
                    
                    const answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
                    if (answerItem) {
                        answerItem.style.backgroundColor = '#d4edda';
                        answerItem.style.borderColor = '#c3e6cb';
                    }
                    
                    // Update matches
                    saveMatches(container);
                }
                
                this.classList.remove('drop-zone-active');
            });
        });
    }
    
    // Save matches to input and submit to server
    function saveMatches(container) {
        console.log('Match Following: Saving matches');
        
        // Collect all matched pairs
        const matches = [];
        const matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        
        matchedItems.forEach(function(item) {
            const pairId = item.getAttribute('data-pair-id');
            matches.push({
                pair_id: pairId,
                matched: true
            });
        });
        
        // Update hidden input
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            const matchesJson = JSON.stringify(matches);
            hiddenInput.value = matchesJson;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(event);
            
            console.log('Match Following: Updated input with matches', matchesJson);
            
            // Submit to server
            submitToServer(container, matches);
        }
    }
    
    // Submit matches to server
    function submitToServer(container, matches) {
        // Get question ID
        const questionId = container.getAttribute('data-question-id');
        if (!questionId) {
            console.error('Match Following: No question ID found');
            return;
        }
        
        // Get survey token
        const token = getSurveyToken();
        if (!token) {
            console.error('Match Following: No survey token found');
            return;
        }
        
        console.log(`Match Following: Submitting to server - question ${questionId}, token ${token}`);
        console.log('Match Following: Match data', JSON.stringify(matches));
        
        // Make AJAX request
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/survey/submit/${token}/${questionId}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Match Following: Submission successful');
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('Match Following: Server response', response);
                    } catch (e) {
                        console.error('Match Following: Could not parse server response');
                    }
                } else {
                    console.error('Match Following: Submission failed', xhr.status);
                }
            }
        };
        
        // Prepare request data
        const requestData = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                value_match_following: JSON.stringify(matches)
            },
            id: new Date().getTime()
        };
        
        xhr.send(JSON.stringify(requestData));
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        const url = window.location.href;
        
        // Try different URL patterns
        const patterns = [
            /\/survey\/([^\/]+)/,
            /\/begin\/([^\/]+)/,
            /\/start\/([^\/]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // Try to get from form
        const form = document.querySelector('form.o_survey_form');
        if (form && form.action) {
            const formMatch = form.action.match(/\/survey\/([^\/]+)/);
            if (formMatch && formMatch[1]) {
                return formMatch[1];
            }
        }
        
        return null;
    }
    
    // Add styles for our elements
    function addStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .match_following_container { padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin: 20px 0; }
            .o_match_questions, .o_match_answers { min-height: 150px; border: 1px dashed #ccc; padding: 10px; background-color: #fff; }
            .o_match_item { background-color: #fff; border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; cursor: move; border-radius: 4px; }
            .o_match_item.dragging { opacity: 0.5; }
            .drop-zone-active { background-color: #e8f4ff; border-color: #b8daff; }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Call addStyles to add our CSS
    addStyles();
    
    // Add global console.log listener to ensure our logs are visible
    const originalConsoleLog = console.log;
    console.log = function() {
        originalConsoleLog.apply(console, arguments);
        
        // Send to window.onerror to ensure it's captured
        if (arguments.length > 0 && typeof arguments[0] === 'string' && arguments[0].includes('Match Following')) {
            window.onerror(arguments[0], '', 0, 0, null);
        }
    };
    
    // Export our functions to window for debugging
    window.matchFollowing = {
        init: initializeMatchFollowing,
        inject: injectMatchFollowingUI,
        setup: setupDragDrop,
        save: saveMatches
    };
})();