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
 * Basic Match Following implementation for Odoo surveys
 * Simplified version that focuses on sending data correctly
 */
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("MatchFollowing: DOM ready");
        
        // Add initialization button for testing
        addDebugButton();
        
        // Initialize with delay to ensure everything is loaded
        setTimeout(function() {
            initializeMatchFollowing();
        }, 1000);
    });
    
    // Add debug button to manually trigger initialization
    function addDebugButton() {
        try {
            var surveyForm = document.querySelector('.o_survey_form');
            if (!surveyForm) return;
            
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary btn-sm mt-2';
            btn.textContent = 'Debug: Init Match Following';
            btn.style.marginLeft = '10px';
            btn.onclick = function() {
                console.log("MatchFollowing: Manual initialization");
                initializeMatchFollowing();
            };
            
            // Find a good place to add the button
            var submitBtn = surveyForm.querySelector('.btn-primary');
            if (submitBtn && submitBtn.parentNode) {
                submitBtn.parentNode.appendChild(btn);
            }
        } catch (e) {
            console.error("MatchFollowing: Error adding debug button", e);
        }
    }
    
    // Main initialization function
    function initializeMatchFollowing() {
        console.log("MatchFollowing: Initializing...");
        
        // Find or create match following containers
        var containers = findOrCreateContainers();
        console.log("MatchFollowing: Found/created " + containers.length + " containers");
        
        // Set up each container
        for (var i = 0; i < containers.length; i++) {
            setupContainer(containers[i]);
        }
        
        // Test API call
        testApiCall();
    }
    
    // Test API call to check connectivity
    function testApiCall() {
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.log("MatchFollowing: No survey token found for test call");
            return;
        }
        
        // Find a question ID to use
        var questionId = null;
        var containers = document.querySelectorAll('.match_following_container');
        if (containers.length > 0) {
            questionId = containers[0].getAttribute('data-question-id');
        }
        
        if (!questionId) {
            var inputs = document.querySelectorAll('input[name^="question_"]');
            if (inputs.length > 0) {
                var match = inputs[0].name.match(/question_(\d+)/);
                if (match && match[1]) {
                    questionId = match[1];
                }
            }
        }
        
        if (!questionId) {
            console.log("MatchFollowing: No question ID found for test call");
            return;
        }
        
        console.log("MatchFollowing: Testing API call with token=" + surveyToken + ", questionId=" + questionId);
        
        // Create test data
        var testData = {
            pair_id: "test_pair_" + new Date().getTime(),
            matched: true
        };
        
        // Send test call
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log("MatchFollowing: Test API call response status:", xhr.status);
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log("MatchFollowing: Test API call response:", response);
                } catch (e) {
                    console.log("MatchFollowing: Test API call response parsing error:", e);
                    console.log("MatchFollowing: Raw response:", xhr.responseText);
                }
            }
        };
        
        var payload = JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
                value_match_following: JSON.stringify([testData])
            },
            id: new Date().getTime()
        });
        
        console.log("MatchFollowing: Sending test payload:", payload);
        xhr.send(payload);
    }
    
    // Find or create match following containers
    function findOrCreateContainers() {
        var containers = document.querySelectorAll('.match_following_container');
        
        // If containers found, return them
        if (containers.length > 0) {
            return containers;
        }
        
        // Otherwise, try to create containers
        var createdContainers = [];
        
        // Find all questions in the survey
        var questions = document.querySelectorAll('.o_survey_form .js_question-wrapper, .o_survey_form .js_question');
        
        for (var i = 0; i < questions.length; i++) {
            var question = questions[i];
            
            // Try to get question ID
            var questionId = extractQuestionId(question);
            if (!questionId) continue;
            
            // Create container
            var container = createContainer(question, questionId);
            if (container) {
                createdContainers.push(container);
            }
        }
        
        // If still no containers, add a test one
        if (createdContainers.length === 0) {
            var surveyForm = document.querySelector('.o_survey_form');
            if (surveyForm) {
                var testWrapper = document.createElement('div');
                testWrapper.className = 'js_question-wrapper test-match-following';
                testWrapper.innerHTML = '<div class="test_question_heading"><h4>Test Match Following Question</h4></div>';
                
                surveyForm.appendChild(testWrapper);
                
                var testContainer = createContainer(testWrapper, 'test123');
                if (testContainer) {
                    createdContainers.push(testContainer);
                }
            }
        }
        
        return createdContainers;
    }
    
    // Extract question ID from an element
    function extractQuestionId(element) {
        // Try data attribute
        var questionId = element.getAttribute('data-question-id');
        
        // If not found, try input name
        if (!questionId) {
            var inputs = element.querySelectorAll('input[name^="question_"]');
            if (inputs.length > 0) {
                var match = inputs[0].name.match(/question_(\d+)/);
                if (match && match[1]) {
                    questionId = match[1];
                }
            }
        }
        
        // If still not found, try URL
        if (!questionId) {
            var url = window.location.href;
            var match = url.match(/\/question\/(\d+)/);
            if (match && match[1]) {
                questionId = match[1];
            }
        }
        
        return questionId;
    }
    
    // Create a match following container
    function createContainer(wrapper, questionId) {
        console.log("MatchFollowing: Creating container for question " + questionId);
        
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        container.innerHTML = `
            <div class="match_following_heading mb-3">
                <h5>Match Following Question</h5>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <h6>Items</h6>
                    <div class="o_match_questions p-2 border rounded"></div>
                </div>
                <div class="col-md-6">
                    <h6>Match With</h6>
                    <div class="o_match_answers p-2 border rounded"></div>
                </div>
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
            <p class="text-muted mt-2 small">Drag items from left to match with items on the right.</p>
            <button type="button" class="btn btn-sm btn-secondary mt-2 submit-match-btn">Save Matches</button>
        `;
        
        wrapper.appendChild(container);
        
        // Add sample items
        var leftZone = container.querySelector('.o_match_questions');
        var rightZone = container.querySelector('.o_match_answers');
        
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
            leftItem.className = 'o_match_item mb-2 p-2 border rounded';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', sample.id);
            leftItem.textContent = sample.left;
            leftZone.appendChild(leftItem);
            
            // Right item
            var rightItem = document.createElement('div');
            rightItem.className = 'o_match_item mb-2 p-2 border rounded';
            rightItem.setAttribute('draggable', 'true');
            rightItem.setAttribute('data-pair-id', sample.id);
            rightItem.textContent = sample.right;
            rightZone.appendChild(rightItem);
        }
        
        // Add click handler for save button
        var submitBtn = container.querySelector('.submit-match-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                updateAndSubmitMatches(container);
            });
        }
        
        return container;
    }
    
    // Set up a container with drag and drop
    function setupContainer(container) {
        if (container.hasAttribute('data-setup-complete')) return;
        
        console.log("MatchFollowing: Setting up container");
        
        // Set up draggable items
        var items = container.querySelectorAll('.o_match_item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            
            // Ensure draggable attribute is set
            item.setAttribute('draggable', 'true');
            
            // Drag start
            item.addEventListener('dragstart', function(e) {
                console.log("MatchFollowing: Drag started");
                e.dataTransfer.setData('text', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
            });
            
            // Drag end
            item.addEventListener('dragend', function() {
                console.log("MatchFollowing: Drag ended");
                this.classList.remove('dragging');
                var activeZones = document.querySelectorAll('.drop-zone-active');
                for (var j = 0; j < activeZones.length; j++) {
                    activeZones[j].classList.remove('drop-zone-active');
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
            });
            
            // Drag leave
            zone.addEventListener('dragleave', function() {
                this.classList.remove('drop-zone-active');
            });
            
            // Drop
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                console.log("MatchFollowing: Item dropped");
                
                this.classList.remove('drop-zone-active');
                
                var pairId = e.dataTransfer.getData('text');
                console.log("MatchFollowing: Dropped item pair ID:", pairId);
                
                if (!pairId) {
                    console.error("MatchFollowing: No pair ID in drop data");
                    return;
                }
                
                if (this.classList.contains('o_match_answers')) {
                    // Mark left item as matched
                    var leftItem = container.querySelector('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        leftItem.setAttribute('data-matched', 'true');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                        console.log("MatchFollowing: Matched left item:", pairId);
                    }
                    
                    // Mark right item as matched
                    var rightItem = container.querySelector('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                    if (rightItem) {
                        rightItem.style.backgroundColor = '#d4edda';
                        rightItem.style.borderColor = '#c3e6cb';
                        console.log("MatchFollowing: Matched right item:", pairId);
                    }
                    
                    // Update matches
                    updateAndSubmitMatches(container);
                }
            });
        }
        
        // Mark as set up
        container.setAttribute('data-setup-complete', 'true');
    }
    
    // Update and submit matches
    function updateAndSubmitMatches(container) {
        console.log("MatchFollowing: Updating matches");
        
        // Get question ID
        var questionId = container.getAttribute('data-question-id');
        if (!questionId) {
            console.error("MatchFollowing: No question ID found");
            return;
        }
        
        // Find all matched items
        var matches = [];
        var matchedItems = container.querySelectorAll('.o_match_questions .o_match_item[data-matched="true"]');
        
        console.log("MatchFollowing: Found " + matchedItems.length + " matched items");
        
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            var pairId = item.getAttribute('data-pair-id');
            
            matches.push({
                pair_id: pairId,
                matched: true
            });
        }
        
        // Update input value
        var input = container.querySelector('input[type="hidden"]');
        if (input) {
            var matchesJson = JSON.stringify(matches);
            input.value = matchesJson;
            console.log("MatchFollowing: Updated input value:", matchesJson);
        }
        
        // Submit to server
        submitMatches(questionId, matches);
    }
    
    // Submit matches to server
    function submitMatches(questionId, matches) {
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error("MatchFollowing: No survey token found");
            return;
        }
        
        console.log("MatchFollowing: Submitting matches to server. Token:", surveyToken, "Question ID:", questionId);
        console.log("MatchFollowing: Match data:", JSON.stringify(matches));
        
        // Use plain XMLHttpRequest for maximum compatibility
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log("MatchFollowing: Server response status:", xhr.status);
                    try {
                        var response = JSON.parse(xhr.responseText);
                        console.log("MatchFollowing: Server response:", response);
                    } catch (e) {
                        console.log("MatchFollowing: Response parsing error:", e);
                        console.log("MatchFollowing: Raw response:", xhr.responseText);
                    }
                } else {
                    console.error("MatchFollowing: Server error status:", xhr.status);
                }
            }
        };
        
        var data = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: JSON.stringify(matches)
            },
            id: new Date().getTime()
        };
        
        var jsonData = JSON.stringify(data);
        console.log("MatchFollowing: Sending payload:", jsonData);
        xhr.send(jsonData);
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        
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
    
    // Add CSS styles
    (function addStyles() {
        var style = document.createElement('style');
        style.textContent = `
            .match_following_container {
                padding: 15px;
                background-color: #f9f9f9;
                border-radius: 4px;
                margin: 15px 0;
            }
            .o_match_questions, .o_match_answers {
                min-height: 150px;
                border: 1px dashed #ccc;
                padding: 10px;
                border-radius: 4px;
                background-color: #fff;
                margin-bottom: 10px;
            }
            .o_match_item {
                background-color: #fff;
                border: 1px solid #dee2e6;
                padding: 10px;
                margin: 5px 0;
                border-radius: 4px;
                cursor: move;
            }
            .o_match_item.dragging {
                opacity: 0.5;
            }
            .drop-zone-active {
                background-color: #e8f4ff;
                border-color: #b8daff;
            }
        `;
        
        document.head.appendChild(style);
    })();
    
    // Make functions available globally (for debugging)
    window.matchFollowing = {
        init: initializeMatchFollowing,
        test: testApiCall,
        submitMatches: submitMatches
    };
})();