/**
 * Direct API test script for match following questions
 * Auto-runs on page load to test different API formats
 */
(function() {
    'use strict';
    
    // Run on page load with slight delay
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            console.log("Direct API Test: Initializing...");
            addTestPanel();
        }, 1000);
    });
    
    // Add test panel to the page
    function addTestPanel() {
        // Create panel element
        var panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '10px';
        panel.style.right = '10px';
        panel.style.backgroundColor = 'rgba(230, 240, 255, 0.9)';
        panel.style.border = '1px solid #007bff';
        panel.style.borderRadius = '5px';
        panel.style.padding = '10px';
        panel.style.zIndex = '9999';
        panel.style.maxWidth = '400px';
        panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        // Panel header
        var header = document.createElement('div');
        header.innerHTML = '<h4 style="margin: 0 0 10px 0;">Match Following API Test</h4>' + 
                         '<div id="apiStatusDisplay">Status: Ready</div>';
        panel.appendChild(header);
        
        // Find survey token and question ID
        var surveyToken = getSurveyToken();
        var questionId = findQuestionId();
        
        // Add info
        var info = document.createElement('div');
        info.innerHTML = '<div style="margin: 10px 0; font-family: monospace;">' +
                         'Survey Token: <span style="font-weight: bold;">' + (surveyToken || 'Not found') + '</span><br>' +
                         'Question ID: <span style="font-weight: bold;">' + (questionId || 'Not found') + '</span>' +
                         '</div>';
        panel.appendChild(info);
        
        // Add test buttons
        var buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.flexDirection = 'column';
        buttonsDiv.style.gap = '5px';
        
        // Test methods
        var methods = [
            { name: 'Test Method 1: Standard JSON-RPC', handler: testMethod1 },
            { name: 'Test Method 2: Direct Value', handler: testMethod2 },
            { name: 'Test Method 3: Form Submit', handler: testMethod3 },
            { name: 'Test Method 4: Value as String', handler: testMethod4 }
        ];
        
        methods.forEach(function(method) {
            var button = document.createElement('button');
            button.textContent = method.name;
            button.className = 'btn btn-sm btn-primary';
            button.style.margin = '2px 0';
            button.onclick = function() {
                method.handler(surveyToken, questionId);
            };
            buttonsDiv.appendChild(button);
        });
        
        panel.appendChild(buttonsDiv);
        
        // Results area
        var results = document.createElement('div');
        results.id = 'apiTestResults';
        results.style.marginTop = '10px';
        results.style.maxHeight = '150px';
        results.style.overflow = 'auto';
        results.style.fontSize = '12px';
        results.style.fontFamily = 'monospace';
        results.style.padding = '5px';
        results.style.backgroundColor = '#f8f9fa';
        results.style.border = '1px solid #ddd';
        results.style.borderRadius = '3px';
        results.innerHTML = 'Results will appear here...';
        panel.appendChild(results);
        
        // Add to body
        document.body.appendChild(panel);
    }
    
    // Update status and results
    function updateStatus(status) {
        var statusDisplay = document.getElementById('apiStatusDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = 'Status: ' + status;
        }
    }
    
    function appendResult(text, isError) {
        var results = document.getElementById('apiTestResults');
        if (results) {
            var entry = document.createElement('div');
            entry.style.marginBottom = '5px';
            entry.style.borderLeft = '3px solid ' + (isError ? '#dc3545' : '#28a745');
            entry.style.paddingLeft = '5px';
            entry.textContent = text;
            
            // Insert at the top
            if (results.firstChild) {
                results.insertBefore(entry, results.firstChild);
            } else {
                results.appendChild(entry);
            }
        }
    }
    
    // Test Method 1: Standard JSON-RPC format
    function testMethod1(surveyToken, questionId) {
        if (!surveyToken || !questionId) {
            appendResult('Error: Missing survey token or question ID', true);
            return;
        }
        
        updateStatus('Running Test Method 1...');
        
        var testData = [
            {
                pair_id: "test1_" + Date.now(),
                matched: true
            }
        ];
        
        var payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: JSON.stringify(testData)
            },
            id: Date.now()
        };
        
        sendRequest(
            '/survey/submit/' + surveyToken + '/' + questionId,
            payload,
            'Test 1: Standard JSON-RPC'
        );
    }
    
    // Test Method 2: Direct value in params
    function testMethod2(surveyToken, questionId) {
        if (!surveyToken || !questionId) {
            appendResult('Error: Missing survey token or question ID', true);
            return;
        }
        
        updateStatus('Running Test Method 2...');
        
        var testData = [
            {
                pair_id: "test2_" + Date.now(),
                matched: true
            }
        ];
        
        var payload = {
            value_match_following: JSON.stringify(testData)
        };
        
        sendRequest(
            '/survey/submit/' + surveyToken + '/' + questionId,
            payload,
            'Test 2: Direct Value'
        );
    }
    
    // Test Method 3: Form submit simulation
    function testMethod3(surveyToken, questionId) {
        if (!surveyToken || !questionId) {
            appendResult('Error: Missing survey token or question ID', true);
            return;
        }
        
        updateStatus('Running Test Method 3...');
        
        var testData = [
            {
                pair_id: "test3_" + Date.now(),
                matched: true
            }
        ];
        
        var formData = new FormData();
        formData.append('token', questionId);
        formData.append('question_' + questionId, JSON.stringify(testData));
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken, true);
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var resultText = 'Test 3: Form Submit - Status: ' + xhr.status;
                appendResult(resultText, xhr.status !== 200);
                
                updateStatus('Test Method 3 Completed');
                console.log('Test 3 Response:', xhr.responseText);
            }
        };
        
        xhr.send(formData);
    }
    
    // Test Method 4: Value as string directly
    function testMethod4(surveyToken, questionId) {
        if (!surveyToken || !questionId) {
            appendResult('Error: Missing survey token or question ID', true);
            return;
        }
        
        updateStatus('Running Test Method 4...');
        
        var testData = [
            {
                pair_id: "test4_" + Date.now(),
                matched: true
            }
        ];
        
        var payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: testData  // Direct object, not stringified
            },
            id: Date.now()
        };
        
        sendRequest(
            '/survey/submit/' + surveyToken + '/' + questionId,
            payload,
            'Test 4: Value as Object'
        );
    }
    
    // Common function to send request
    function sendRequest(url, payload, testName) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var resultText = testName + ' - Status: ' + xhr.status;
                appendResult(resultText, xhr.status !== 200);
                
                updateStatus('Test Completed');
                console.log(testName + ' Response:', xhr.responseText);
                
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log(testName + ' Parsed Response:', response);
                } catch (e) {
                    console.log(testName + ' Raw Response Text:', xhr.responseText);
                }
            }
        };
        
        var jsonPayload = JSON.stringify(payload);
        console.log(testName + ' Request Payload:', jsonPayload);
        xhr.send(jsonPayload);
    }
    
    // Helper: Get survey token from URL
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
        
        // If not found in URL, try to find in form
        var form = document.querySelector('.o_survey_form');
        if (form && form.action) {
            var actionMatch = form.action.match(/\/survey\/([^\/]+)/);
            if (actionMatch && actionMatch[1]) {
                return actionMatch[1];
            }
        }
        
        // Fallback to hardcoded value if needed
        return "b7dc50ae-d05b-4a32-af12-7cbb30f0c09d";
    }
    
    // Helper: Find a question ID
    function findQuestionId() {
        // Try to get from form inputs
        var inputs = document.querySelectorAll('input[name^="question_"]');
        for (var i = 0; i < inputs.length; i++) {
            var nameMatch = inputs[i].name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                return nameMatch[1];
            }
        }
        
        // Try to find from URL
        var url = window.location.href;
        var match = url.match(/\/question\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        
        // Fallback to hardcoded value
        return "34";
    }
})();
