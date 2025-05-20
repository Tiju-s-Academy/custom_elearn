/**
 * Debug script for match following functionality
 * This can be called from browser console: matchDebug.test()
 */
var matchDebug = (function() {
    'use strict';
    
    // Direct test function
    function testApiCall() {
        console.log("MatchDebug: Starting API test...");
        
        // Get survey token
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error("MatchDebug: No survey token found in URL");
            return;
        }
        
        // Find a question ID
        var questionId = getQuestionId();
        if (!questionId) {
            console.error("MatchDebug: No question ID found");
            return;
        }
        
        console.log("MatchDebug: Using survey token: " + surveyToken);
        console.log("MatchDebug: Using question ID: " + questionId);
        
        // Sample match data
        var matchData = [
            {
                pair_id: "debug_test_" + new Date().getTime(),
                matched: true
            }
        ];
        
        // Send direct API call
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/survey/submit/" + surveyToken + "/" + questionId, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log("MatchDebug: API response status: " + xhr.status);
                console.log("MatchDebug: API response text: " + xhr.responseText);
                
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log("MatchDebug: API response parsed:", response);
                } catch (e) {
                    console.error("MatchDebug: Error parsing response:", e);
                }
            }
        };
        
        var payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: JSON.stringify(matchData)
            },
            id: new Date().getTime()
        };
        
        console.log("MatchDebug: Sending payload:", payload);
        xhr.send(JSON.stringify(payload));
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/) || 
                    url.match(/\/start\/([^\/]+)/);
                    
        return match ? match[1] : null;
    }
    
    // Find a question ID to use
    function getQuestionId() {
        // Try to find from URL
        var url = window.location.href;
        var match = url.match(/\/question\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        
        // Try to find from form inputs
        var inputs = document.querySelectorAll('input[name^="question_"]');
        for (var i = 0; i < inputs.length; i++) {
            var nameMatch = inputs[i].name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                return nameMatch[1];
            }
        }
        
        // Try to find from match following containers
        var containers = document.querySelectorAll('.match_following_container');
        if (containers.length > 0) {
            return containers[0].getAttribute('data-question-id');
        }
        
        return null;
    }
    
    // Return public API
    return {
        test: testApiCall
    };
})();
