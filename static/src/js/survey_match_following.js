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
 * Match Following Questions for Surveys
 * Simple implementation that works with the Odoo survey engine
 */
(function() {
    'use strict';

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Initializing");
        initMatchFollowing();

        // Try again after a delay to ensure everything is loaded
        setTimeout(initMatchFollowing, 2000);
    });

    // Main initialization function
    function initMatchFollowing() {
        // Add test panel for debugging
        addTestPanel();
        
        // Find match following containers
        var containers = document.querySelectorAll('.match_following_container');
        
        if (containers.length > 0) {
            console.log("Match Following: Found " + containers.length + " containers");
            
            // Initialize each container
            for (var i = 0; i < containers.length; i++) {
                setupMatchFollowing(containers[i]);
            }
        } else {
            // Try to detect match following questions
            var questionContainers = document.querySelectorAll('.o_survey_form .js_question-wrapper');
            console.log("Match Following: Found " + questionContainers.length + " question containers");
            
            for (var j = 0; j < questionContainers.length; j++) {
                var questionContainer = questionContainers[j];
                
                // Check if this is a match following question
                var questionType = '';
                var typeInput = questionContainer.querySelector('input[name="question_type"]');
                if (typeInput) {
                    questionType = typeInput.value;
                }
                
                if (questionType === 'match_following') {
                    console.log("Match Following: Found match following question, creating container");
                    createMatchFollowingUI(questionContainer);
                }
            }
        }
    }
    
    // Create UI for a match following question
    function createMatchFollowingUI(questionWrapper) {
        // Get question ID
        var questionId = '';
        var inputs = questionWrapper.querySelectorAll('input[name^="question_"]');
        if (inputs.length > 0) {
            var nameMatch = inputs[0].name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                questionId = nameMatch[1];
            }
        }
        
        if (!questionId) {
            console.warn("Match Following: Could not determine question ID");
            return;
        }
        
        // Check if container already exists
        if (questionWrapper.querySelector('.match_following_container')) {
            return;
        }
        
        // Create container
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create the structure
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Items</h5>
                    <div class="o_match_questions"></div>
                </div>
                <div class="col-md-6">
                    <h5>Match With</h5>
                    <div class="o_match_answers"></div>
                </div>
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
        `;
        
        // Add to question wrapper
        questionWrapper.appendChild(container);
        
        // Add sample items
        addSampleItems(container);
        
        // Set up drag and drop
        setupMatchFollowing(container);
    }
    
    // Add sample items for testing
    function addSampleItems(container) {
        var questionId = container.getAttribute('data-question-id');
        var items = [
            { id: 'item1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'item2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'item3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        var questionsContainer = container.querySelector('.o_match_questions');
        var answersContainer = container.querySelector('.o_match_answers');
        
        if (!questionsContainer || !answersContainer) {
            return;
        }
        
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            
            // Create left item
            var leftItem = document.createElement('div');
            leftItem.className = 'o_match_item';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', item.id);
            leftItem.textContent = item.left;
            questionsContainer.appendChild(leftItem);
            
            // Create right item
            var rightItem = document.createElement('div');
            rightItem.className = 'o_match_item';
            rightItem.setAttribute('data-pair-id', item.id);
            rightItem.textContent = item.right;
            answersContainer.appendChild(rightItem);
        }
    }
    
    // Set up match following functionality for a container
    function setupMatchFollowing(container) {
        // Skip if already set up
        if (container.getAttribute('data-setup-complete') === 'true') {
            return;
        }
        
        // Set up CSS
        container.style.padding = '15px';
        container.style.backgroundColor = '#f9f9f9';
        container.style.borderRadius = '4px';
        container.style.margin = '15px 0';
        
        // Find question and answer containers
        var questionsContainer = container.querySelector('.o_match_questions');
        var answersContainer = container.querySelector('.o_match_answers');
        
        if (!questionsContainer || !answersContainer) {
            return;
        }
        
        // Style drop zones
        var dropZones = [questionsContainer, answersContainer];
        for (var i = 0; i < dropZones.length; i++) {
            var zone = dropZones[i];
            zone.style.minHeight = '150px';
            zone.style.padding = '10px';
            zone.style.border = '1px dashed #ccc';
            zone.style.borderRadius = '4px';
            zone.style.backgroundColor = '#fff';
        }
        
        // Make items draggable
        var items = container.querySelectorAll('.o_match_item');
        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            
            // Style items
            item.style.padding = '10px';
            item.style.border = '1px solid #ddd';
            item.style.borderRadius = '4px';
            item.style.margin = '5px 0';
            item.style.backgroundColor = '#fff';
            item.style.cursor = 'move';
            
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
                
                var activeZones = container.querySelectorAll('.drop-zone-active');
                for (var k = 0; k < activeZones.length; k++) {
                    activeZones[k].classList.remove('drop-zone-active');
                    activeZones[k].style.backgroundColor = '#fff';
                }
            });
        }
        
        // Set up drop zones
        for (var l = 0; l < dropZones.length; l++) {
            var dropZone = dropZones[l];
            
            // Drag over
            dropZone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-zone-active');
                this.style.backgroundColor = '#f0f8ff';
            });
            
            // Drag leave
            dropZone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
                this.style.backgroundColor = '#fff';
            });
            
            // Drop
            dropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-zone-active');
                this.style.backgroundColor = '#fff';
                
                var pairId = e.dataTransfer.getData('text/plain');
                
                if (this.classList.contains('o_match_answers')) {
                    // Mark items as matched
                    var leftItem = container.querySelector('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        leftItem.setAttribute('data-matched', 'true');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                    }
                    
                    var rightItem = container.querySelector('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                    if (rightItem) {
                        rightItem.style.backgroundColor = '#d4edda';
                        rightItem.style.borderColor = '#c3e6cb';
                    }
                    
                    // Update and submit
                    updateMatchesInput(container);
                }
            });
        }
        
        // Mark as set up
        container.setAttribute('data-setup-complete', 'true');
    }
    
    // Update the hidden input with the matched pairs
    function updateMatchesInput(container) {
        var matches = [];
        var matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        }
        
        var input = container.querySelector('input[type="hidden"]');
        if (input) {
            input.value = JSON.stringify(matches);
        }
        
        // Submit to server
        submitMatches(container, matches);
    }
    
    // Submit matches to the server
    function submitMatches(container, matches) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.warn("Match Following: Missing question ID or survey token");
            return;
        }
        
        console.log("Match Following: Submitting matches for question " + questionId);
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log("Match Following: Submission successful");
                } else {
                    console.error("Match Following: Error submitting matches:", xhr.status);
                }
            }
        };
        
        // The key is to format the data exactly as expected by the server
        var data = JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
                value_match_following: matches  // Pass as object, not string
            },
            id: Date.now()
        });
        
        console.log("Match Following: Sending data:", data);
        xhr.send(data);
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/) || 
                    url.match(/\/start\/([^\/]+)/);
        
        return match ? match[1] : null;
    }

    // Add a simple test panel for debugging
    function addTestPanel() {
        if (document.getElementById('match-following-test-panel')) {
            return;  // Already exists
        }
        
        // Find a good container to add the panel to
        var container = document.querySelector('.o_survey_form') || 
                        document.querySelector('.oe_website_sale') || 
                        document.querySelector('#wrapwrap');
                        
        if (!container) {
            return;
        }
        
        var panel = document.createElement('div');
        panel.id = 'match-following-test-panel';
        panel.style.margin = '20px 0';
        panel.style.padding = '15px';
        panel.style.backgroundColor = '#f0f0f0';
        panel.style.border = '1px solid #ccc';
        panel.style.borderRadius = '4px';
        
        panel.innerHTML = `
            <h5>Match Following Debug Panel</h5>
            <button id="match-following-test-btn" class="btn btn-sm btn-primary">Test API Call</button>
            <div id="match-following-result" class="mt-2 p-2 bg-light" style="font-size: 12px; font-family: monospace;"></div>
        `;
        
        container.appendChild(panel);
        
        // Add button handler
        document.getElementById('match-following-test-btn').addEventListener('click', function() {
            var surveyToken = getSurveyToken();
            var questionId = '34';  // Default to question ID 34
            
            // Find first match following question
            var questions = document.querySelectorAll('.match_following_container');
            if (questions.length > 0) {
                questionId = questions[0].getAttribute('data-question-id') || questionId;
            }
            
            // Send test call
            var testData = [{
                pair_id: 'test_' + Date.now(),
                matched: true
            }];
            
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    var resultElem = document.getElementById('match-following-result');
                    if (resultElem) {
                        resultElem.textContent = 'Status: ' + xhr.status + '\n' + xhr.responseText;
                    }
                }
            };
            
            var data = JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    value_match_following: testData
                },
                id: Date.now()
            });
            
            xhr.send(data);
        });
    }
})();