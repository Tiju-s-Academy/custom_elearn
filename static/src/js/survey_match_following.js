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
 * Match Following implementation for Odoo surveys
 * Uses the Value as Object approach that was successful in testing
 */
(function() {
    'use strict';
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Initializing");
        setTimeout(initMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        try {
            console.log("Match Following: Looking for containers");
            
            // Find or create match following containers
            var containers = document.querySelectorAll('.match_following_container');
            
            // If no containers found, try to create them
            if (containers.length === 0) {
                createContainers();
                // Re-query for containers
                containers = document.querySelectorAll('.match_following_container');
            }
            
            // Set up drag and drop for each container
            for (var i = 0; i < containers.length; i++) {
                setupDragDrop(containers[i]);
            }
            
            console.log("Match Following: Initialized " + containers.length + " containers");
        } catch (error) {
            console.error("Match Following error:", error);
        }
    }
    
    // Create match following containers in the survey
    function createContainers() {
        // Find survey questions
        var questions = document.querySelectorAll('.js_question-wrapper');
        
        for (var i = 0; i < questions.length; i++) {
            var question = questions[i];
            
            // Try to get question ID
            var questionId = getQuestionId(question);
            if (!questionId) continue;
            
            // Create container for this question
            createMatchFollowingContainer(question, questionId);
        }
        
        // If no questions found, add a test container
        if (questions.length === 0) {
            var surveyForm = document.querySelector('.o_survey_form');
            if (surveyForm) {
                var testWrapper = document.createElement('div');
                testWrapper.className = 'js_question-wrapper test-question';
                
                var heading = document.createElement('h4');
                heading.textContent = 'Match Following Test';
                testWrapper.appendChild(heading);
                
                surveyForm.appendChild(testWrapper);
                
                createMatchFollowingContainer(testWrapper, '34'); // Use a known question ID
            }
        }
    }
    
    // Create a match following container for a question
    function createMatchFollowingContainer(wrapper, questionId) {
        console.log("Match Following: Creating container for question " + questionId);
        
        // Create container element
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create structure
        var html = 
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
            '<p class="text-muted">Drag items from left to right to match them.</p>' +
            '<button type="button" class="btn btn-sm btn-primary mt-2 js_submit_matches">Submit Matches</button>';
        
        container.innerHTML = html;
        
        // Apply styles
        container.style.padding = '15px';
        container.style.backgroundColor = '#f9f9f9';
        container.style.borderRadius = '4px';
        container.style.margin = '15px 0';
        
        // Style the drop zones
        var dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        for (var i = 0; i < dropZones.length; i++) {
            var zone = dropZones[i];
            zone.style.minHeight = '150px';
            zone.style.border = '1px dashed #ccc';
            zone.style.padding = '10px';
            zone.style.backgroundColor = '#fff';
            zone.style.borderRadius = '4px';
            zone.style.marginBottom = '10px';
        }
        
        // Add to wrapper
        wrapper.appendChild(container);
        
        // Add sample items
        addSampleItems(container, questionId);
        
        // Add submit button handler
        var submitBtn = container.querySelector('.js_submit_matches');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                console.log("Match Following: Manual submission triggered");
                var matches = collectMatches(container);
                submitMatches(questionId, matches);
            });
        }
        
        return container;
    }
    
    // Add sample items to a container
    function addSampleItems(container, questionId) {
        var samples = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        var leftZone = container.querySelector('.o_match_questions');
        var rightZone = container.querySelector('.o_match_answers');
        
        if (!leftZone || !rightZone) return;
        
        // Add left items
        for (var i = 0; i < samples.length; i++) {
            var sample = samples[i];
            
            // Create left item
            var leftItem = document.createElement('div');
            leftItem.className = 'o_match_item';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', sample.id);
            leftItem.textContent = sample.left;
            
            // Style the item
            leftItem.style.backgroundColor = '#fff';
            leftItem.style.border = '1px solid #dee2e6';
            leftItem.style.padding = '10px';
            leftItem.style.margin = '5px 0';
            leftItem.style.borderRadius = '4px';
            leftItem.style.cursor = 'grab';
            
            leftZone.appendChild(leftItem);
            
            // Create right item
            var rightItem = document.createElement('div');
            rightItem.className = 'o_match_item';
            rightItem.setAttribute('draggable', 'true');
            rightItem.setAttribute('data-pair-id', sample.id);
            rightItem.textContent = sample.right;
            
            // Style the item
            rightItem.style.backgroundColor = '#fff';
            rightItem.style.border = '1px solid #dee2e6';
            rightItem.style.padding = '10px';
            rightItem.style.margin = '5px 0';
            rightItem.style.borderRadius = '4px';
            rightItem.style.cursor = 'grab';
            
            rightZone.appendChild(rightItem);
        }
    }
    
    // Set up drag and drop for a container
    function setupDragDrop(container) {
        if (container.getAttribute('data-drag-drop-setup') === 'true') {
            return; // Already set up
        }
        
        console.log("Match Following: Setting up drag and drop");
        
        // Get all draggable items
        var items = container.querySelectorAll('.o_match_item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            
            // Make draggable
            item.setAttribute('draggable', 'true');
            
            // Drag start
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            });
            
            // Drag end
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                this.style.opacity = '1';
                
                // Remove active class from all drop zones
                var activeZones = container.querySelectorAll('.drop-zone-active');
                for (var j = 0; j < activeZones.length; j++) {
                    activeZones[j].classList.remove('drop-zone-active');
                    activeZones[j].style.backgroundColor = '#fff';
                    activeZones[j].style.borderColor = '#ccc';
                }
            });
        }
        
        // Set up drop zones
        var dropZones = container.querySelectorAll('.o_match_questions, .o_match_answers');
        for (var k = 0; k < dropZones.length; k++) {
            var zone = dropZones[k];
            
            // Drag over
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
                this.style.backgroundColor = '#e8f4ff';
                this.style.borderColor = '#b8daff';
            });
            
            // Drag leave
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
                this.style.backgroundColor = '#fff';
                this.style.borderColor = '#ccc';
            });
            
            // Drop
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                
                // Reset styles
                this.classList.remove('drop-zone-active');
                this.style.backgroundColor = '#fff';
                this.style.borderColor = '#ccc';
                
                // Get the dropped item's pair ID
                var pairId = e.dataTransfer.getData('text/plain');
                if (!pairId) return;
                
                // Only process when dropping in answers zone
                if (this.classList.contains('o_match_answers')) {
                    // Find the left item
                    var leftItem = container.querySelector('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        // Mark as matched
                        leftItem.setAttribute('data-matched', 'true');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                    }
                    
                    // Find the right item
                    var rightItem = container.querySelector('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                    if (rightItem) {
                        rightItem.style.backgroundColor = '#d4edda';
                        rightItem.style.borderColor = '#c3e6cb';
                    }
                    
                    // Collect and submit matches
                    var matches = collectMatches(container);
                    submitMatches(container.getAttribute('data-question-id'), matches);
                }
            });
        }
        
        // Mark as set up
        container.setAttribute('data-drag-drop-setup', 'true');
    }
    
    // Collect matches from a container
    function collectMatches(container) {
        var matches = [];
        var matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        }
        
        // Update the hidden input
        var hiddenInput = container.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            // Important: Do NOT stringify the array here, we need the raw object
            hiddenInput.value = JSON.stringify(matches);
        }
        
        return matches;
    }
    
    // Submit matches to the server
    function submitMatches(questionId, matches) {
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error("Match Following: Could not determine survey token");
            return;
        }
        
        console.log("Match Following: Submitting matches for question " + questionId);
        console.log("Match Following: Using survey token " + surveyToken);
        console.log("Match Following: Matches data:", matches);
        
        // Create request
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/survey/submit/" + surveyToken + "/" + questionId, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log("Match Following: Submission successful");
                    try {
                        var response = JSON.parse(xhr.responseText);
                        console.log("Match Following: Server response:", response);
                    } catch (e) {
                        console.log("Match Following: Raw response:", xhr.responseText);
                    }
                } else {
                    console.error("Match Following: Submission failed with status " + xhr.status);
                }
            }
        };
        
        // This is the key change - passing matches directly as an object, not as a stringified JSON
        var payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: matches // Direct object, not stringified
            },
            id: new Date().getTime()
        };
        
        console.log("Match Following: Sending payload:", payload);
        xhr.send(JSON.stringify(payload));
    }
    
    // Get question ID from an element
    function getQuestionId(element) {
        // Try data attribute first
        var id = element.getAttribute('data-question-id');
        
        // Try to get from input name
        if (!id) {
            var inputs = element.querySelectorAll('input[name^="question_"]');
            if (inputs.length > 0) {
                var match = inputs[0].name.match(/question_(\d+)/);
                if (match && match[1]) {
                    id = match[1];
                }
            }
        }
        
        return id;
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        
        // Try different URL patterns
        var patterns = [
            /\/survey\/([^\/]+)/,
            /\/begin\/([^\/]+)/,
            /\/start\/([^\/]+)/
        ];
        
        for (var i = 0; i < patterns.length; i++) {
            var match = url.match(patterns[i]);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    // Define global API
    window.matchFollowing = {
        init: initMatchFollowing,
        submit: submitMatches
    };
})();