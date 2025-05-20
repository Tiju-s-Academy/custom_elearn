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
 * Match Following functionality for Odoo surveys
 * Simplified version that focuses on correctly submitting data
 */
(function() {
    'use strict';
    
    // When document is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match following module initialized");
        
        // Wait a bit for Odoo to finish rendering
        setTimeout(function() {
            initMatchFollowing();
            
            // Try again after a few seconds to catch late-rendered elements
            setTimeout(initMatchFollowing, 3000);
        }, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        // First check for existing containers
        var containers = document.querySelectorAll('.match_following_container');
        
        if (containers.length === 0) {
            console.log("No match following containers found, searching for questions...");
            detectAndInjectMatchFollowing();
        } else {
            console.log(`Found ${containers.length} match following containers`);
            containers.forEach(initContainer);
        }
    }
    
    // Detect match following questions and inject UI
    function detectAndInjectMatchFollowing() {
        // Look for match following questions in the form
        var questions = document.querySelectorAll('.o_survey_form .js_question');
        
        questions.forEach(function(question) {
            // Check if this is a match following question
            var questionType = question.querySelector('input[name="question_type"]')?.value;
            if (questionType === 'match_following') {
                console.log("Found a match following question, injecting UI");
                injectMatchFollowingUI(question);
            }
        });
    }
    
    // Inject the UI for a match following question
    function injectMatchFollowingUI(questionElement) {
        // Find question ID from the form element
        var questionId = '';
        var inputElement = questionElement.querySelector('input[name^="question_"]');
        
        if (inputElement) {
            var nameMatch = inputElement.name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                questionId = nameMatch[1];
            }
        }
        
        if (!questionId) {
            console.error("Could not determine question ID");
            return;
        }
        
        console.log(`Creating UI for question ID ${questionId}`);
        
        // Create our container
        var container = document.createElement('div');
        container.className = 'match_following_container mt-3';
        container.setAttribute('data-question-id', questionId);
        
        // Create row with columns
        var row = document.createElement('div');
        row.className = 'row';
        
        // Left column (items)
        var leftCol = document.createElement('div');
        leftCol.className = 'col-md-6';
        leftCol.innerHTML = '<h5>Items</h5><div class="o_match_questions p-3 border rounded"></div>';
        
        // Right column (matches)
        var rightCol = document.createElement('div');
        rightCol.className = 'col-md-6';
        rightCol.innerHTML = '<h5>Match With</h5><div class="o_match_answers p-3 border rounded"></div>';
        
        // Assemble the UI
        row.appendChild(leftCol);
        row.appendChild(rightCol);
        container.appendChild(row);
        
        // Add instructions
        var instructions = document.createElement('p');
        instructions.className = 'text-muted mt-2';
        instructions.textContent = 'Drag items from left to right to match them correctly.';
        container.appendChild(instructions);
        
        // Use the original input element for storing results
        if (inputElement) {
            // Move the input inside our container
            container.appendChild(inputElement);
        } else {
            // Create a new input if none exists
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'question_' + questionId;
            input.value = '[]';
            container.appendChild(input);
        }
        
        // Insert the UI
        questionElement.appendChild(container);
        
        // Add sample data for testing
        addSampleItems(container);
        
        // Set up drag and drop
        initContainer(container);
    }
    
    // Add sample items for testing
    function addSampleItems(container) {
        var questionId = container.getAttribute('data-question-id');
        
        // Sample data
        var sampleItems = [
            { id: 'pair_1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair_2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair_3_' + questionId, left: 'Carrot', right: 'Vegetable' }
        ];
        
        var leftContainer = container.querySelector('.o_match_questions');
        var rightContainer = container.querySelector('.o_match_answers');
        
        if (leftContainer && rightContainer) {
            sampleItems.forEach(function(item) {
                // Left item
                var leftItem = document.createElement('div');
                leftItem.className = 'o_match_item mb-2 p-2 bg-white border rounded shadow-sm';
                leftItem.setAttribute('data-pair-id', item.id);
                leftItem.textContent = item.left;
                leftContainer.appendChild(leftItem);
                
                // Right item
                var rightItem = document.createElement('div');
                rightItem.className = 'o_match_item mb-2 p-2 bg-white border rounded shadow-sm';
                rightItem.setAttribute('data-pair-id', item.id);
                rightItem.textContent = item.right;
                rightContainer.appendChild(rightItem);
            });
        }
    }
    
    // Initialize a single container
    function initContainer(container) {
        // Add drag and drop functionality to all items
        var items = container.querySelectorAll('.o_match_item');
        items.forEach(function(item) {
            item.setAttribute('draggable', true);
            
            // Drag start event
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
            });
            
            // Drag end event
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
        });
        
        // Set up drop zones
        var dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        dropZones.forEach(function(zone) {
            // Drag over event
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
            });
            
            // Drag leave event
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            // Drop event
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-zone-active');
                
                var pairId = e.dataTransfer.getData('text/plain');
                
                // Handle the matching only when dropping in the answers zone
                if (this.classList.contains('o_match_answers')) {
                    var questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    var answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
                    
                    // Mark items as matched
                    if (questionItem && answerItem) {
                        questionItem.setAttribute('data-matched', 'true');
                        questionItem.classList.add('matched');
                        answerItem.classList.add('matched');
                    }
                    
                    // Update the input value and submit
                    updateInputAndSubmit(container);
                }
            });
        });
    }
    
    // Update the input value and submit the data
    function updateInputAndSubmit(container) {
        var matches = [];
        var questionId = container.getAttribute('data-question-id');
        
        // Get all matched pairs
        container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]').forEach(function(item) {
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        });
        
        // Update the input field
        var input = container.querySelector('input[type="hidden"]');
        if (input) {
            var matchesJson = JSON.stringify(matches);
            input.value = matchesJson;
            console.log(`Updated input value for question ${questionId}:`, matchesJson);
            
            // Trigger input change event for form handling
            var event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        }
        
        // Submit directly to the server
        submitToServer(questionId, matches);
    }
    
    // Submit data directly to the server
    function submitToServer(questionId, matches) {
        // Get survey token from URL
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error('Could not determine survey token');
            return;
        }
        
        console.log(`Submitting match following data: questionId=${questionId}, surveyToken=${surveyToken}`);
        console.log('Match data:', JSON.stringify(matches));
        
        // Use fetch API for the request
        fetch(`/survey/submit/${surveyToken}/${questionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    value_match_following: JSON.stringify(matches)
                },
                id: Date.now()
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Server response:', data);
        })
        .catch(error => {
            console.error('Error submitting data:', error);
        });
    }
    
    // Extract survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        
        // Try different URL patterns
        var patterns = [
            /\/survey\/([^\/]+)/,
            /\/begin\/([^\/]+)/,
            /\/session\/([^\/]+)/
        ];
        
        for (var i = 0; i < patterns.length; i++) {
            var match = url.match(patterns[i]);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // Try to find token in a form
        var form = document.querySelector('.o_survey_form');
        if (form && form.action) {
            var actionMatch = form.action.match(/\/survey\/([^\/]+)/);
            if (actionMatch && actionMatch[1]) {
                return actionMatch[1];
            }
        }
        
        return null;
    }
    
    // Add the necessary styles
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = `
            .match_following_container { padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 20px; }
            .o_match_questions, .o_match_answers { min-height: 150px; border: 1px dashed #ccc; padding: 10px; border-radius: 4px; background-color: #fff; }
            .o_match_item { background-color: #fff; border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; border-radius: 4px; cursor: grab; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .o_match_item.dragging { opacity: 0.5; cursor: grabbing; }
            .o_match_item.matched { background-color: #d4edda; border-color: #c3e6cb; }
            .drop-zone-active { background-color: #e8f4ff; border-color: #b8daff; }
        `;
        document.head.appendChild(style);
    }
    
    // Add styles to the page
    addStyles();
})();