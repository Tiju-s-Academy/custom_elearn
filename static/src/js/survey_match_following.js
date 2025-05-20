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
 * Basic Match Following functionality for Odoo surveys
 * Simple vanilla JS implementation with no module imports or advanced features
 */
(function() {
    'use strict';

    // Initialize when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: DOM ready");
        setTimeout(init, 1000);
    });

    // Main initialization function
    function init() {
        try {
            console.log("Match Following: Initializing");
            
            // Look for match following containers
            var containers = document.querySelectorAll('.match_following_container');
            
            // Create UI if none found
            if (containers.length === 0) {
                createMatchUI();
                
                // Re-query after creation
                containers = document.querySelectorAll('.match_following_container');
            }
            
            // Set up drag and drop
            for (var i = 0; i < containers.length; i++) {
                setupContainer(containers[i]);
            }
            
            // Add styles
            addStyles();
            
            console.log("Match Following: Initialized " + containers.length + " containers");
        } catch (error) {
            console.error("Match Following error:", error);
        }
    }

    // Create match following UI where needed
    function createMatchUI() {
        try {
            console.log("Match Following: Creating UI");
            
            // Look for survey questions
            var questions = document.querySelectorAll('.o_survey_form .js_question-wrapper');
            
            for (var i = 0; i < questions.length; i++) {
                var question = questions[i];
                var questionId = '';
                
                // Try to find question ID from inputs
                var inputs = question.querySelectorAll('input[name^="question_"]');
                if (inputs.length > 0) {
                    var nameMatch = inputs[0].name.match(/question_(\d+)/);
                    if (nameMatch && nameMatch[1]) {
                        questionId = nameMatch[1];
                    }
                }
                
                // Skip if no ID found
                if (!questionId) continue;
                
                // Skip if already has match following container
                if (question.querySelector('.match_following_container')) continue;
                
                // Create container
                var container = document.createElement('div');
                container.className = 'match_following_container';
                container.setAttribute('data-question-id', questionId);
                
                // HTML structure
                container.innerHTML = 
                    '<div class="row">' +
                        '<div class="col-md-6">' +
                            '<h5>Items</h5>' +
                            '<div class="o_match_questions"></div>' +
                        '</div>' +
                        '<div class="col-md-6">' +
                            '<h5>Match With</h5>' +
                            '<div class="o_match_answers"></div>' +
                        '</div>' +
                    '</div>' +
                    '<input type="hidden" name="question_' + questionId + '" value="[]">' +
                    '<p class="text-muted small">Drag items from left to right to match them.</p>';
                
                // Add to question
                question.appendChild(container);
                
                // Add sample items
                addSampleItems(container, questionId);
            }
        } catch (error) {
            console.error("Match Following: Error creating UI", error);
        }
    }

    // Add sample items for testing
    function addSampleItems(container, questionId) {
        try {
            var leftZone = container.querySelector('.o_match_questions');
            var rightZone = container.querySelector('.o_match_answers');
            
            if (!leftZone || !rightZone) return;
            
            // Sample data
            var samples = [
                { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
                { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
                { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
            ];
            
            // Create items
            for (var i = 0; i < samples.length; i++) {
                var sample = samples[i];
                
                // Left item
                var leftItem = document.createElement('div');
                leftItem.className = 'o_match_item';
                leftItem.setAttribute('draggable', 'true');
                leftItem.setAttribute('data-pair-id', sample.id);
                leftItem.textContent = sample.left;
                leftZone.appendChild(leftItem);
                
                // Right item
                var rightItem = document.createElement('div');
                rightItem.className = 'o_match_item';
                rightItem.setAttribute('draggable', 'true');
                rightItem.setAttribute('data-pair-id', sample.id);
                rightItem.textContent = sample.right;
                rightZone.appendChild(rightItem);
            }
        } catch (error) {
            console.error("Match Following: Error adding samples", error);
        }
    }

    // Set up drag and drop for a container
    function setupContainer(container) {
        try {
            // Skip if already initialized
            if (container.getAttribute('data-initialized') === 'true') return;
            
            // Mark as initialized
            container.setAttribute('data-initialized', 'true');
            
            // Set up items
            var items = container.querySelectorAll('.o_match_item');
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                
                // Make sure it's draggable
                item.setAttribute('draggable', 'true');
                
                // Drag start event
                item.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                    this.classList.add('dragging');
                });
                
                // Drag end event
                item.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                });
            }
            
            // Set up drop zones
            var zones = container.querySelectorAll('.o_match_questions, .o_match_answers');
            for (var j = 0; j < zones.length; j++) {
                var zone = zones[j];
                
                // Dragover event
                zone.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    this.classList.add('drop-zone-active');
                });
                
                // Dragleave event
                zone.addEventListener('dragleave', function() {
                    this.classList.remove('drop-zone-active');
                });
                
                // Drop event
                zone.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.classList.remove('drop-zone-active');
                    
                    // Get pair ID
                    var pairId = e.dataTransfer.getData('text/plain');
                    
                    // Skip if no ID
                    if (!pairId) return;
                    
                    // Only process when dropping in answers zone
                    if (this.classList.contains('o_match_answers')) {
                        // Find question item
                        var questionItem = container.querySelector('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                        if (questionItem) {
                            questionItem.setAttribute('data-matched', 'true');
                            questionItem.classList.add('matched');
                        }
                        
                        // Find answer item
                        var answerItem = container.querySelector('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                        if (answerItem) {
                            answerItem.classList.add('matched');
                        }
                        
                        // Update matches
                        updateMatches(container);
                    }
                });
            }
        } catch (error) {
            console.error("Match Following: Error setting up container", error);
        }
    }

    // Update matches in hidden input
    function updateMatches(container) {
        try {
            var matches = [];
            var matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
            
            for (var i = 0; i < matchedItems.length; i++) {
                var item = matchedItems[i];
                matches.push({
                    pair_id: item.getAttribute('data-pair-id'),
                    matched: true
                });
            }
            
            // Find hidden input and update
            var input = container.querySelector('input[type="hidden"]');
            if (input) {
                input.value = JSON.stringify(matches);
                
                // Submit to server
                submitToServer(container, matches);
            }
        } catch (error) {
            console.error("Match Following: Error updating matches", error);
        }
    }

    // Submit matches to server
    function submitToServer(container, matches) {
        try {
            var questionId = container.getAttribute('data-question-id');
            var token = getSurveyToken();
            
            if (!questionId || !token) return;
            
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/survey/submit/' + token + '/' + questionId, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log("Match Following: Submitted successfully");
                    } else {
                        console.log("Match Following: Submission failed", xhr.status);
                    }
                }
            };
            
            var data = {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    value_match_following: JSON.stringify(matches)
                },
                id: new Date().getTime()
            };
            
            xhr.send(JSON.stringify(data));
        } catch (error) {
            console.error("Match Following: Error submitting to server", error);
        }
    }

    // Get survey token from URL
    function getSurveyToken() {
        try {
            var url = window.location.href;
            var match = url.match(/\/survey\/([^\/]+)/) || 
                        url.match(/\/begin\/([^\/]+)/) || 
                        url.match(/\/start\/([^\/]+)/);
                        
            return match ? match[1] : null;
        } catch (error) {
            console.error("Match Following: Error getting survey token", error);
            return null;
        }
    }

    // Add CSS styles
    function addStyles() {
        try {
            var style = document.createElement('style');
            style.textContent = '' +
                '.match_following_container { padding: 15px; background: #f9f9f9; border-radius: 4px; margin: 15px 0; }' +
                '.o_match_questions, .o_match_answers { min-height: 150px; border: 1px dashed #ccc; padding: 10px; background: #fff; margin-bottom: 10px; }' +
                '.o_match_item { background: #fff; border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; border-radius: 4px; cursor: grab; }' +
                '.o_match_item.dragging { opacity: 0.5; }' +
                '.o_match_item.matched { background: #d4edda; border-color: #c3e6cb; }' +
                '.drop-zone-active { background: #e8f4ff; border-color: #b8daff; }';
                
            document.head.appendChild(style);
        } catch (error) {
            console.error("Match Following: Error adding styles", error);
        }
    }

    // Make init function available globally
    window.initMatchFollowing = init;
})();