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

(function() {
    'use strict';
    
    // Wait for the DOM to load
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match following module loaded");
        initMatchFollowing();
    });
    
    // Initialize match following functionality
    function initMatchFollowing() {
        // Find all match following containers
        const containers = document.querySelectorAll('.match_following_container');
        
        if (containers.length === 0) {
            console.log("No match following containers found");
            return;
        }
        
        console.log(`Found ${containers.length} match following container(s)`);
        
        // Initialize each container
        containers.forEach(function(container) {
            setupDragDrop(container);
        });
    }
    
    // Set up drag and drop functionality
    function setupDragDrop(container) {
        // Make items draggable
        const items = container.querySelectorAll('.o_match_item');
        
        items.forEach(function(item) {
            item.setAttribute('draggable', true);
            
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
            });
            
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
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
                const target = this;
                
                if (target.classList.contains('o_match_answers')) {
                    // Mark the item as matched
                    const questionItem = container.querySelector(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                    if (questionItem) {
                        questionItem.setAttribute('data-matched', 'true');
                        questionItem.classList.add('matched');
                    }
                    
                    // Highlight the answer item
                    const answerItem = container.querySelector(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
                    if (answerItem) {
                        answerItem.classList.add('matched');
                    }
                }
                
                // Update matches and submit
                updateAndSubmitMatches(container);
                
                // Remove styling
                target.classList.remove('drop-zone-active');
                const draggingItems = document.querySelectorAll('.dragging');
                draggingItems.forEach(function(item) {
                    item.classList.remove('dragging');
                });
            });
        });
    }
    
    // Update matches and submit to server
    function updateAndSubmitMatches(container) {
        const matches = [];
        
        // Collect matched pairs
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
            const matchesJson = JSON.stringify(matches);
            hiddenInput.value = matchesJson;
            
            console.log("Updated matches:", matchesJson);
        }
        
        // Get question ID from container
        let questionId = container.getAttribute('data-question-id');
        
        // If not found directly, try to extract from hidden input name
        if (!questionId && hiddenInput) {
            const inputName = hiddenInput.getAttribute('name');
            if (inputName) {
                const questionMatch = inputName.match(/question_(\d+)/);
                if (questionMatch && questionMatch[1]) {
                    questionId = questionMatch[1];
                }
            }
        }
        
        // Get survey token from URL
        const url = window.location.href;
        const tokenMatch = url.match(/\/survey\/([^\/]+)/);
        let surveyToken = tokenMatch ? tokenMatch[1] : '';
        
        // Handle additional URL formats
        if (!surveyToken) {
            // Try alternative URL format
            const altMatch = url.match(/\/begin\/([^\/]+)/);
            if (altMatch && altMatch[1]) {
                surveyToken = altMatch[1];
            }
        }
        
        // Submit if we have both questionId and surveyToken
        if (questionId && surveyToken) {
            console.log(`Submitting match following data for question ${questionId} in survey ${surveyToken}`);
            submitToServer(surveyToken, questionId, matches);
        } else {
            console.error("Cannot submit: Missing questionId or surveyToken", {
                questionId: questionId,
                surveyToken: surveyToken
            });
        }
    }
    
    // Submit data to the server
    function submitToServer(surveyToken, questionId, matches) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/survey/submit/${surveyToken}/${questionId}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Match following data submitted successfully');
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('Server response:', response);
                    } catch (e) {
                        console.warn('Could not parse server response');
                    }
                } else {
                    console.error('Error submitting match following data:', xhr.status, xhr.statusText);
                }
            }
        };
        
        // Prepare the request payload
        const payload = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                value_match_following: JSON.stringify(matches)
            },
            id: Date.now()
        };
        
        console.log('Sending payload:', payload);
        xhr.send(JSON.stringify(payload));
    }
})();