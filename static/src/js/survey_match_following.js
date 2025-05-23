/**
 * Match Following component for Odoo surveys
 * Simple implementation using vanilla JS (no Odoo module system)
 */
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Match Following] Document ready');
        
        // Use setTimeout to ensure survey form is fully loaded
        setTimeout(initializeMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initializeMatchFollowing() {
        console.log('[Match Following] Initializing...');
        
        // Check if on survey page
        if (!document.querySelector('.o_survey_form')) {
            console.log('[Match Following] Not on a survey page');
            return;
        }
        
        // Add minimal styles
        addStyles();
        
        // Process existing questions
        processQuestions();
        
        // Monitor for new questions that might be added dynamically
        setupObserver();
        
        // Add debug button for testing
        addDebugButton();
        
        console.log('[Match Following] Initialization complete');
    }
    
    // Process all questions in the survey
    function processQuestions() {
        // Get all question containers using different possible selectors
        var selectors = [
            '.js_question-wrapper', 
            '.js_question', 
            '.o_survey_form_content div[id^="survey_question"]'
        ];
        
        var questionsFound = false;
        
        // Try each selector
        for (var i = 0; i < selectors.length && !questionsFound; i++) {
            var questions = document.querySelectorAll(selectors[i]);
            
            if (questions.length > 0) {
                questionsFound = true;
                console.log(`[Match Following] Found ${questions.length} questions with selector: ${selectors[i]}`);
                
                // Process each question
                for (var j = 0; j < questions.length; j++) {
                    processQuestion(questions[j]);
                }
            }
        }
        
        if (!questionsFound) {
            console.log('[Match Following] No questions found');
        }
    }
    
    // Process a single question
    function processQuestion(questionElem) {
        // Skip if already processed
        if (questionElem.hasAttribute('data-match-following-processed')) {
            return;
        }
        
        // Check if it's a match following question
        var questionType = getQuestionType(questionElem);
        
        if (questionType === 'match_following') {
            console.log('[Match Following] Found match following question');
            createMatchFollowingUI(questionElem);
        }
        
        // Mark as processed
        questionElem.setAttribute('data-match-following-processed', 'true');
    }
    
    // Get question type
    function getQuestionType(questionElem) {
        // Try to find type from input element
        var typeInput = questionElem.querySelector('input[name="question_type"]');
        if (typeInput && typeInput.value === 'match_following') {
            return 'match_following';
        }
        
        // Try data attribute
        if (questionElem.getAttribute('data-question-type') === 'match_following') {
            return 'match_following';
        }
        
        return '';
    }
    
    // Get question ID
    function getQuestionId(questionElem) {
        // Try data attribute
        var id = questionElem.getAttribute('data-question-id');
        if (id) return id;
        
        // Try ID attribute (survey_question_X)
        if (questionElem.id && questionElem.id.match(/survey_question_(\d+)/)) {
            return questionElem.id.match(/survey_question_(\d+)/)[1];
        }
        
        // Try input name
        var inputs = questionElem.querySelectorAll('input[name^="question_"]');
        for (var i = 0; i < inputs.length; i++) {
            var match = inputs[i].name.match(/question_(\d+)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // If no ID found, generate a unique one
        return 'q' + Math.floor(Math.random() * 10000);
    }
    
    // Create match following UI
    function createMatchFollowingUI(questionElem) {
        var questionId = getQuestionId(questionElem);
        console.log(`[Match Following] Creating UI for question ${questionId}`);
        
        // Create container
        var container = document.createElement('div');
        container.className = 'match_following_container my-4';
        container.setAttribute('data-question-id', questionId);
        
        // Create content
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-2">
                        <div class="card-header bg-light">Items</div>
                        <div class="card-body p-2 left-items"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-2">
                        <div class="card-header bg-light">Match With</div>
                        <div class="card-body p-2 right-items"></div>
                    </div>
                </div>
            </div>
            <div class="text-muted small mt-2 mb-3">
                Drag items from left column to match with items in right column.
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
            <div class="match-status"></div>
        `;
        
        // Add to question element
        questionElem.appendChild(container);
        
        // Add items
        addSampleItems(container, questionId);
        
        // Setup drag and drop
        setupDragDrop(container);
    }
    
    // Add sample items to container
    function addSampleItems(container, questionId) {
        var leftContainer = container.querySelector('.left-items');
        var rightContainer = container.querySelector('.right-items');
        
        var pairs = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        // Add left items
        pairs.forEach(function(pair) {
            var item = document.createElement('div');
            item.className = 'match-item p-2 mb-2 border rounded bg-white';
            item.style.cursor = 'grab';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-pair-id', pair.id);
            item.textContent = pair.left;
            leftContainer.appendChild(item);
        });
        
        // Add right items (shuffled)
        shuffle(pairs).forEach(function(pair) {
            var item = document.createElement('div');
            item.className = 'match-item p-2 mb-2 border rounded bg-white';
            item.setAttribute('data-pair-id', pair.id);
            item.textContent = pair.right;
            rightContainer.appendChild(item);
        });
    }
    
    // Setup drag and drop functionality
    function setupDragDrop(container) {
        // Get items
        var leftItems = container.querySelectorAll('.left-items .match-item');
        var rightItems = container.querySelectorAll('.right-items .match-item');
        
        // Setup drag for left items
        leftItems.forEach(function(item) {
            // Drag start
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            });
            
            // Drag end
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                this.style.opacity = '';
            });
        });
        
        // Setup drop for right items
        rightItems.forEach(function(item) {
            // Allow drop
            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.backgroundColor = '#e8f4ff';
                this.style.borderColor = '#b8daff';
            });
            
            // Reset styles
            item.addEventListener('dragleave', function() {
                this.style.backgroundColor = '';
                this.style.borderColor = '';
            });
            
            // Handle drop
            item.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.backgroundColor = '';
                this.style.borderColor = '';
                
                var pairId = e.dataTransfer.getData('text/plain');
                if (!pairId) return;
                
                // Check if correct match
                if (this.getAttribute('data-pair-id') === pairId) {
                    // Correct match
                    this.classList.add('matched');
                    this.style.backgroundColor = '#d4edda';
                    this.style.borderColor = '#c3e6cb';
                    
                    // Find and mark left item
                    var leftItem = container.querySelector('.left-items .match-item[data-pair-id="' + pairId + '"]');
                    if (leftItem) {
                        leftItem.classList.add('matched');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                        leftItem.setAttribute('data-matched', 'true');
                    }
                    
                    // Update matches
                    saveMatches(container);
                } else {
                    // Wrong match
                    this.style.backgroundColor = '#f8d7da';
                    this.style.borderColor = '#f5c6cb';
                    
                    // Reset after a moment
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = '';
                        self.style.borderColor = '';
                    }, 1000);
                }
            });
        });
    }
    
    // Save matches to server
    function saveMatches(container) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.log('[Match Following] Missing question ID or survey token');
            return;
        }
        
        // Collect matches
        var matches = [];
        var matchedItems = container.querySelectorAll('.left-items .match-item[data-matched="true"]');
        
        matchedItems.forEach(function(item) {
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        });
        
        // Update hidden input
        var input = container.querySelector('input[name="question_' + questionId + '"]');
        if (input) {
            input.value = JSON.stringify(matches);
        }
        
        // Check completion
        updateStatus(container, matches.length);
        
        // Submit to server
        submitToServer(surveyToken, questionId, matches);
    }
    
    // Submit matches to server
    function submitToServer(surveyToken, questionId, matches) {
        console.log(`[Match Following] Submitting matches for question ${questionId}`);
        
        try {
            // Create request
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            // Handle response
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log('[Match Following] Submission successful');
                    } else {
                        console.error('[Match Following] Error submitting matches:', xhr.status);
                    }
                }
            };
            
            // Format data as expected by server
            var data = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    value_match_following: matches
                },
                id: Date.now()
            };
            
            // Send request
            xhr.send(JSON.stringify(data));
        } catch (e) {
            console.error('[Match Following] Error sending request:', e);
        }
    }
    
    // Update match status
    function updateStatus(container, matchCount) {
        var statusElem = container.querySelector('.match-status');
        if (!statusElem) return;
        
        var totalItems = container.querySelectorAll('.left-items .match-item').length;
        
        if (matchCount === totalItems) {
            statusElem.innerHTML = '<div class="alert alert-success py-2">All items matched correctly!</div>';
            
            // Find next button
            var nextBtn = document.querySelector('.o_survey_form button[type="submit"]');
            if (nextBtn) {
                nextBtn.focus();
            }
        } else {
            statusElem.innerHTML = '<div class="text-muted">' + matchCount + ' of ' + totalItems + ' items matched</div>';
        }
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/);
                    
        if (match && match[1]) {
            return match[1];
        }
        
        // Try token input
        var tokenInput = document.querySelector('input[name="token"]');
        if (tokenInput) {
            return tokenInput.value;
        }
        
        return null;
    }
    
    // Setup mutation observer to watch for dynamically added questions
    function setupObserver() {
        // Find target to observe
        var target = document.querySelector('.o_survey_form_content');
        if (!target) return;
        
        // Create observer
        var observer = new MutationObserver(function(mutations) {
            var shouldProcess = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                }
            });
            
            if (shouldProcess) {
                console.log('[Match Following] New content detected');
                // Process with delay to make sure everything is loaded
                setTimeout(processQuestions, 500);
            }
        });
        
        // Start observing
        observer.observe(target, { 
            childList: true, 
            subtree: true 
        });
    }
    
    // Add debug button
    function addDebugButton() {
        var form = document.querySelector('.o_survey_form');
        if (!form) return;
        
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-secondary d-none'; // Hidden by default
        btn.textContent = 'Debug Match Following';
        btn.style.margin = '5px';
        
        btn.addEventListener('click', function() {
            console.log('[Match Following] Debug button clicked');
            processQuestions();
            
            // Try to force submission
            var container = document.querySelector('.match_following_container');
            if (container) {
                var questionId = container.getAttribute('data-question-id');
                var surveyToken = getSurveyToken();
                
                if (questionId && surveyToken) {
                    console.log(`[Match Following] Test submission with questionId=${questionId}, surveyToken=${surveyToken}`);
                    submitToServer(surveyToken, questionId, [{
                        pair_id: 'test_' + Date.now(),
                        matched: true
                    }]);
                }
            }
        });
        
        form.appendChild(btn);
    }
    
    // Add styles
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = `
            .match_following_container {
                margin: 15px 0;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            .left-items, .right-items {
                min-height: 150px;
            }
            .match-item {
                transition: all 0.2s;
                cursor: pointer;
            }
            .match-item.matched {
                background-color: #d4edda !important;
                border-color: #c3e6cb !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Shuffle array
    function shuffle(array) {
        var result = array.slice();
        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    }
})();