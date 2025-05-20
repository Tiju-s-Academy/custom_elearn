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
 * Simple match following implementation
 * Focused only on essential functionality
 */
(function() {
    'use strict';
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Initializing");
        setTimeout(init, 1000);
    });
    
    function init() {
        // Find a question ID to use
        var questionId = findQuestionId();
        if (!questionId) {
            console.error("Match Following: No question ID found");
            return;
        }
        
        // Add a test DIV to show it's working
        addTestDiv(questionId);
        
        // Send direct test request
        sendDirectRequest(questionId);
    }
    
    // Find a question ID to use
    function findQuestionId() {
        // Try to find from form inputs
        var inputs = document.querySelectorAll('input[name^="question_"]');
        for (var i = 0; i < inputs.length; i++) {
            var nameMatch = inputs[i].name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                return nameMatch[1];
            }
        }
        
        // If not found, return a default
        return "34"; // Use the question ID from your logs
    }
    
    // Add a visible test div to show script is working
    function addTestDiv(questionId) {
        var testDiv = document.createElement('div');
        testDiv.style.padding = '10px';
        testDiv.style.margin = '10px';
        testDiv.style.backgroundColor = '#f0f0f0';
        testDiv.style.border = '1px solid #ccc';
        testDiv.style.borderRadius = '4px';
        
        testDiv.innerHTML = '<h4>Match Following Debug</h4>' +
                           '<p>Question ID: ' + questionId + '</p>' +
                           '<p>Survey Token: ' + getSurveyToken() + '</p>' +
                           '<button id="matchTestBtn">Send Test Match Data</button>';
        
        // Add to page
        var targetElem = document.querySelector('.o_survey_form') || 
                         document.querySelector('#wrap') || 
                         document.body;
        
        targetElem.appendChild(testDiv);
        
        // Add button click handler
        document.getElementById('matchTestBtn').addEventListener('click', function() {
            sendDirectRequest(questionId);
        });
    }
    
    // Send direct request to server
    function sendDirectRequest(questionId) {
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error("Match Following: No survey token found");
            return;
        }
        
        console.log("Match Following: Sending direct request");
        console.log("- Question ID: " + questionId);
        console.log("- Survey Token: " + surveyToken);
        
        // Test data
        var testMatch = {
            pair_id: "test_pair_" + Date.now(),
            matched: true
        };
        
        // Use fetch API
        fetch('/survey/submit/' + surveyToken + '/' + questionId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    value_match_following: JSON.stringify([testMatch])
                },
                id: Date.now()
            })
        })
        .then(function(response) {
            console.log("Match Following: Response status:", response.status);
            return response.text();
        })
        .then(function(text) {
            console.log("Match Following: Raw response:", text);
            try {
                var json = JSON.parse(text);
                console.log("Match Following: Parsed response:", json);
            } catch (e) {
                console.error("Match Following: Parse error:", e);
            }
        })
        .catch(function(error) {
            console.error("Match Following: Error:", error);
        });
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        
        // Try different patterns
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
        
        // If still not found, use the one from logs
        return "b7dc50ae-d05b-4a32-af12-7cbb30f0c09d";
    }
})();