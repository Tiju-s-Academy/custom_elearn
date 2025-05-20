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
 */
(function() {
    'use strict';
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match following module initialized");
        
        // Use a timeout to ensure Odoo's survey is fully loaded
        setTimeout(setupMatchFollowing, 1000);
        
        // Try again after some time in case of dynamic loading
        setTimeout(setupMatchFollowing, 3000);
    });
    
    // Main setup function
    function setupMatchFollowing() {
        console.log("Setting up match following...");
        
        // Look for survey form
        const surveyForm = document.querySelector('.o_survey_form');
        if (!surveyForm) {
            console.log("Survey form not found");
            return;
        }
        
        // Try to find match following containers
        let containers = document.querySelectorAll('.match_following_container');
        
        // If no containers found, look for match following questions and inject UI
        if (containers.length === 0) {
            console.log("No match following containers found, looking for questions...");
            
            // Find questions with type match_following
            const questions = surveyForm.querySelectorAll('.js_question-wrapper');
            questions.forEach(function(questionWrapper) {
                const questionType = questionWrapper.querySelector('input[name="question_type"]')?.value;
                const questionId = getQuestionId(questionWrapper);
                
                if (questionType === 'match_following' || questionId) {
                    console.log("Found question, injecting match following UI");
                    injectMatchFollowingUI(questionWrapper, questionId);
                }
            });
            
            // Re-query for containers after injection
            containers = document.querySelectorAll('.match_following_container');
        }
        
        // Initialize containers
        if (containers.length > 0) {
            console.log(`Found ${containers.length} match following containers`);
            containers.forEach(initializeContainer);
        } else {
            console.log("No match following containers found after injection");
        }
    }
    
    // Extract question ID from wrapper
    function getQuestionId(wrapper) {
        // Try to get from data attribute
        let questionId = wrapper.getAttribute('data-question-id');
        
        // If not found, try to get from hidden input
        if (!questionId) {
            const hiddenInput = wrapper.querySelector('input[name^="question_"]');
            if (hiddenInput) {
                const nameMatch = hiddenInput.name.match(/question_(\d+)/);
                if (nameMatch && nameMatch[1]) {
                    questionId = nameMatch[1];
                }
            }
        }
        
        return questionId;
    }
    
    // Inject match following UI into question wrapper
    function injectMatchFollowingUI(wrapper, questionId) {
        // Create container
        const container = document.createElement('div');
        container.className = 'match_following_container mt-3';
        container.setAttribute('data-question-id', questionId);
        
        // Create row with two columns
        const row = document.createElement('div');
        row.className = 'row';
        
        // Create left column
        const leftCol = document.createElement('div');
        leftCol.className = 'col-md-6';
        
        const leftTitle = document.createElement('h5');
        leftTitle.textContent = 'Items';
        
        const leftDropZone = document.createElement('div');
        leftDropZone.className = 'o_match_questions p-3 border rounded';
        
        leftCol.appendChild(leftTitle);
        leftCol.appendChild(leftDropZone);
        
        // Create right column
        const rightCol = document.createElement('div');
        rightCol.className = 'col-md-6';
        
        const rightTitle = document.createElement('h5');
        rightTitle.textContent = 'Match With';
        
        const rightDropZone = document.createElement('div');
        rightDropZone.className = 'o_match_answers p-3 border rounded';
        
        rightCol.appendChild(rightTitle);
        rightCol.appendChild(rightDropZone);
        
        // Add columns to row
        row.appendChild(leftCol);
        row.appendChild(rightCol);
        
        // Add row to container
        container.appendChild(row);
        
        // Add help text
        const helpText = document.createElement('p');
        helpText.className = 'text-muted small mt-2';
        helpText.textContent = 'Drag items from left to right to match them';
        
        container.appendChild(helpText);
        
        // Add hidden input for storing matches
        const inputName = `question_${questionId}`;
        
        // Look for existing input
        let hiddenInput = wrapper.querySelector(`input[name="${inputName}"]`);
        
        // Create new input if not found
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = inputName;
            hiddenInput.value = '[]';
            container.appendChild(hiddenInput);
        } else {
            // Move existing input inside container
            container.appendChild(hiddenInput);
        }
        
        // Insert container into wrapper
        wrapper.appendChild(container);
        
        // Add sample data
        addSampleItems(container, questionId);
    }
    
    // Add sample match items
    function addSampleItems(container, questionId) {
        const samples = [
            { id: `sample_1_${questionId}`, left: 'Apple', right: 'Fruit' },
            { id: `sample_2_${questionId}`, left: 'Dog', right: 'Animal' },
            { id: `sample_3_${questionId}`, left: 'Car', right: 'Vehicle' }
        ];
        
        const leftZone = container.querySelector('.o_match_questions');
        const rightZone = container.querySelector('.o_match_answers');
        
        samples.forEach(function(sample) {
            // Create left item
            const leftItem = document.createElement('div');
            leftItem.className = 'o_match_item mb-2 p-2 bg-white border rounded';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', sample.id);
            leftItem.textContent = sample.left;
            leftZone.appendChild(leftItem);
            
            // Create right item
            const rightItem = document.createElement('div');
            rightItem.className = 'o_match_item mb-2 p-2 bg-white border rounded';
            rightItem.setAttribute('draggable', 'true');
            rightItem.setAttribute('data-pair-id', sample.id);
            rightItem.textContent = sample.right;
            rightZone.appendChild(rightItem);
        });
    }
    
    // Initialize drag and drop for a container
    function initializeContainer(container) {
        // Make items draggable
        const items = container.querySelectorAll('.o_match_item');
        items.forEach(function(item) {
            item.setAttribute('draggable', 'true');
            
            // Drag start event
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
                
                // Log that drag has started
                console.log('Drag started with item:', this.textContent);
            });
            
            // Drag end event
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
        });
        
        // Set up drop zones
        const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        dropZones.forEach(function(zone) {
            // Allow drop
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
            });
            
            // When leaving the drop zone
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            // When item is dropped
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-zone-active');
                
                const pairId = e.dataTransfer.getData('text/plain');
                console.log('Item dropped, pair ID:', pairId);
                
                // Only process if dropped in answer zone
                if (this.classList.contains('o_match_answers')) {
                    // Mark left item as matched
                    const questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    if (questionItem) {
                        questionItem.setAttribute('data-matched', 'true');
                        questionItem.classList.add('matched');
                    }
                    
                    // Mark right item as matched
                    const answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
                    if (answerItem) {
                        answerItem.classList.add('matched');
                    }
                    
                    // Update matches and submit
                    updateAndSubmitMatches(container);
                }
            });
        });
    }
    
    // Update matches and submit to server
    function updateAndSubmitMatches(container) {
        // Collect matched pairs
        const matches = [];
        const matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        
        matchedItems.forEach(function(item) {
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        });
        
        // Update hidden input
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            const matchesJson = JSON.stringify(matches);
            hiddenInput.value = matchesJson;
            console.log('Updated input with matches:', matchesJson);
            
            // Trigger change event for form handlers
            const event = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(event);
        }
        
        // Submit to server
        const questionId = container.getAttribute('data-question-id');
        if (questionId) {
            submitToServer(questionId, matches);
        }
    }
    
    // Submit matches to server
    function submitToServer(questionId, matches) {
        // Get survey token from URL
        const surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error('Could not determine survey token');
            return;
        }
        
        console.log(`Submitting matches to server: questionId=${questionId}, surveyToken=${surveyToken}`);
        console.log('Match data:', JSON.stringify(matches));
        
        // Use fetch API
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
            console.error('Error submitting matches:', error);
        });
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        const url = window.location.href;
        
        // Try different patterns
        const patterns = [
            /\/survey\/([^\/]+)/,
            /\/begin\/([^\/]+)/,
            /\/session\/([^\/]+)/
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const match = url.match(patterns[i]);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    // Add CSS styles
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .match_following_container { padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin-bottom: 20px; }
            .o_match_questions, .o_match_answers { min-height: 150px; border: 1px dashed #ccc; padding: 10px; border-radius: 4px; background-color: #fff; }
            .o_match_item { background-color: #fff; border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; border-radius: 4px; cursor: grab; }
            .o_match_item.dragging { opacity: 0.5; cursor: grabbing; }
            .o_match_item.matched { background-color: #d4edda; border-color: #c3e6cb; }
            .drop-zone-active { background-color: #e8f4ff; border-color: #b8daff; }
        `;
        document.head.appendChild(style);
    }
    
    // Add styles to the page
    addStyles();
})();