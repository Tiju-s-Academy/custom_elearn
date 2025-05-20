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
 * Match Following Question for Surveys
 */
(function() {
    'use strict';

    // Initialize when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Short delay to ensure survey form is fully rendered
        setTimeout(initMatchFollowing, 500);
    });

    function initMatchFollowing() {
        console.log("Initializing match following questions...");
        
        // Look for match following containers
        var containers = document.querySelectorAll('.match_following_container');
        if (containers.length === 0) {
            // Try to find places to inject our components
            injectMatchFollowing();
            return;
        }

        // Set up each container
        containers.forEach(function(container) {
            setupDragDrop(container);
        });
    }

    function injectMatchFollowing() {
        // Look for question data in the page to identify match following questions
        const surveyForm = document.querySelector('.o_survey_form');
        if (!surveyForm) return;

        // Try to find special question wrappers
        const questionWrappers = surveyForm.querySelectorAll('.js_question-wrapper');
        
        questionWrappers.forEach(function(wrapper) {
            // Look for a question type identifier
            const questionType = wrapper.getAttribute('data-question-type') || 
                                wrapper.querySelector('input[name="question_type"]')?.value;
            
            if (questionType === 'match_following') {
                console.log('Found match following question, injecting UI');
                createMatchFollowingUI(wrapper);
            }
        });
    }

    function createMatchFollowingUI(wrapper) {
        // Create container
        const container = document.createElement('div');
        container.className = 'match_following_container';
        
        // Try to get question ID
        const questionIdInput = wrapper.querySelector('input[name^="question_"]');
        let questionId = '';
        if (questionIdInput) {
            const nameMatch = questionIdInput.name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                questionId = nameMatch[1];
                container.setAttribute('data-question-id', questionId);
            }
        }
        
        // Create basic structure
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row mt-3';
        
        // Left column
        const leftCol = document.createElement('div');
        leftCol.className = 'col-md-6';
        
        const leftTitle = document.createElement('h5');
        leftTitle.textContent = 'Items';
        
        const leftContainer = document.createElement('div');
        leftContainer.className = 'o_match_questions border rounded p-3';
        
        leftCol.appendChild(leftTitle);
        leftCol.appendChild(leftContainer);
        
        // Right column
        const rightCol = document.createElement('div');
        rightCol.className = 'col-md-6';
        
        const rightTitle = document.createElement('h5');
        rightTitle.textContent = 'Match With';
        
        const rightContainer = document.createElement('div');
        rightContainer.className = 'o_match_answers border rounded p-3';
        
        rightCol.appendChild(rightTitle);
        rightCol.appendChild(rightContainer);
        
        // Add columns to row
        rowDiv.appendChild(leftCol);
        rowDiv.appendChild(rightCol);
        
        // Add hidden input to store results
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = questionIdInput ? questionIdInput.name : ('question_' + questionId);
        hiddenInput.value = '[]';
        
        // Add everything to container
        container.appendChild(rowDiv);
        container.appendChild(hiddenInput);
        
        // Add instructions
        const helpText = document.createElement('p');
        helpText.className = 'text-muted mt-2';
        helpText.textContent = 'Drag items from the left column to match with items in the right column.';
        container.appendChild(helpText);
        
        // Insert into wrapper
        const targetElement = wrapper.querySelector('.o_survey_question') || wrapper;
        targetElement.appendChild(container);
        
        // Set up drag and drop
        setupDragDrop(container);
        
        // Try to load sample data (mock data for testing)
        loadSampleData(container);
    }

    function loadSampleData(container) {
        // Sample items (normally these would come from the server)
        const sampleItems = [
            { id: 1, left: "Apple", right: "Fruit" },
            { id: 2, left: "Dog", right: "Animal" },
            { id: 3, left: "Car", right: "Vehicle" }
        ];
        
        const leftContainer = container.querySelector('.o_match_questions');
        const rightContainer = container.querySelector('.o_match_answers');
        
        if (leftContainer && rightContainer) {
            sampleItems.forEach(function(item) {
                // Create left item
                const leftItem = document.createElement('div');
                leftItem.className = 'o_match_item';
                leftItem.setAttribute('data-pair-id', item.id);
                leftItem.textContent = item.left;
                leftContainer.appendChild(leftItem);
                
                // Create right item
                const rightItem = document.createElement('div');
                rightItem.className = 'o_match_item';
                rightItem.setAttribute('data-pair-id', item.id);
                rightItem.textContent = item.right;
                rightContainer.appendChild(rightItem);
            });
        }
    }

    function setupDragDrop(container) {
        // Set up drag and drop for items
        const items = container.querySelectorAll('.o_match_item');
        items.forEach(function(item) {
            item.setAttribute('draggable', 'true');
            
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
            });
            
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                container.querySelectorAll('.drop-zone-active').forEach(function(el) {
                    el.classList.remove('drop-zone-active');
                });
            });
        });
        
        // Set up drop zones
        const dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        dropZones.forEach(function(zone) {
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
            });
            
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                const pairId = e.dataTransfer.getData('text/plain');
                
                if (this.classList.contains('o_match_answers')) {
                    // When dropping in the answers area, mark as matched
                    const questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    if (questionItem) {
                        questionItem.setAttribute('data-matched', 'true');
                        questionItem.classList.add('matched');
                    }
                    
                    const answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
                    if (answerItem) {
                        answerItem.classList.add('matched');
                    }
                    
                    // Update the form input
                    updateMatches(container);
                }
                
                this.classList.remove('drop-zone-active');
            });
        });
    }

    function updateMatches(container) {
        const matches = [];
        
        // Get all matched items
        container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]').forEach(function(item) {
            const pairId = item.getAttribute('data-pair-id');
            matches.push({
                pair_id: pairId,
                matched: true
            });
        });
        
        // Update hidden input
        const hiddenInput = container.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(matches);
            
            // Trigger change event for form handling
            const event = new Event('change', {bubbles: true});
            hiddenInput.dispatchEvent(event);
            
            // Try to save the answer using standard survey submission
            saveAnswer(container, matches);
        }
    }

    function saveAnswer(container, matches) {
        try {
            // Try to use Odoo's standard survey functions if available
            if (window.survey_form_validate) {
                // This is the standard function used by Odoo surveys
                return;
            }
            
            // Otherwise use our direct submission method
            const form = document.querySelector('.o_survey_form');
            if (!form) return;
            
            const questionInput = container.querySelector('input[type="hidden"]');
            if (!questionInput) return;
            
            const questionId = container.getAttribute('data-question-id');
            if (!questionId) return;
            
            // Get survey token from URL or form
            let surveyToken = '';
            const url = window.location.href;
            const tokenMatch = url.match(/\/survey\/([^\/]+)/) || url.match(/\/begin\/([^\/]+)/);
            if (tokenMatch) {
                surveyToken = tokenMatch[1];
            } else if (form.action) {
                const actionMatch = form.action.match(/\/survey\/([^\/]+)/);
                if (actionMatch) {
                    surveyToken = actionMatch[1];
                }
            }
            
            if (!surveyToken) return;
            
            // Submit the answer
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/survey/submit/${surveyToken}/${questionId}`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    value_match_following: JSON.stringify(matches)
                },
                id: Date.now()
            }));
        } catch (e) {
            console.error('Error saving answer:', e);
        }
    }

    // Add CSS styles to the page
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .match_following_container { padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin-bottom: 20px; }
            .o_match_questions, .o_match_answers { min-height: 150px; border: 1px dashed #ccc; padding: 10px; border-radius: 4px; background-color: #fff; }
            .o_match_item { background-color: #fff; border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; border-radius: 4px; cursor: move; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .o_match_item.dragging { opacity: 0.5; }
            .o_match_item.matched { background-color: #d4edda; border-color: #c3e6cb; }
            .drop-zone-active { background-color: #e8f4ff; border-color: #b8daff; }
        `;
        document.head.appendChild(style);
    }
    
    // Add the styles
    addStyles();
})();