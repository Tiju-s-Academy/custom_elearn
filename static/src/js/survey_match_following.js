/**
 * Match Following Component for Surveys
 * Vanilla JS implementation with no module dependencies
 */
(function() {
    'use strict';
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Match Following: Document ready');
        setTimeout(initMatchFollowing, 1000);
    });
    
    // Main initialization function
    function initMatchFollowing() {
        console.log('Match Following: Initializing');
        
        // Check if we're on a survey page
        if (!document.querySelector('.o_survey_form')) {
            console.log('Match Following: Not on a survey page');
            return;
        }
        
        // Add CSS styles
        addStyles();
        
        // Process all question containers
        findAndProcessQuestions();
        
        // Monitor for dynamically added questions
        setupMutationObserver();
    }
    
    // Find and process all match following questions
    function findAndProcessQuestions() {
        var selectors = [
            '.js_question-wrapper', 
            '.js_question',
            '.o_survey_form_content .question-container'
        ];
        
        var processed = false;
        
        selectors.forEach(function(selector) {
            var questions = document.querySelectorAll(selector);
            if (questions.length > 0) {
                console.log(`Match Following: Found ${questions.length} potential questions with ${selector}`);
                
                questions.forEach(function(question) {
                    processed = processQuestion(question) || processed;
                });
            }
        });
        
        return processed;
    }
    
    // Process a single question
    function processQuestion(question) {
        // Skip if already processed
        if (question.hasAttribute('data-match-following-processed')) {
            return false;
        }
        
        // Check if this is a match following question
        var questionType = '';
        var typeInput = question.querySelector('input[name="question_type"]');
        if (typeInput) {
            questionType = typeInput.value;
        }
        
        // Mark as processed regardless of type
        question.setAttribute('data-match-following-processed', 'true');
        
        // Only continue for match following questions
        if (questionType === 'match_following') {
            console.log('Match Following: Found match following question');
            createMatchFollowingUI(question);
            return true;
        }
        
        return false;
    }
    
    // Create the match following UI
    function createMatchFollowingUI(question) {
        // Get question ID
        var questionId = getQuestionId(question);
        if (!questionId) {
            console.error('Match Following: Could not determine question ID');
            return;
        }
        
        // Create container
        var container = document.createElement('div');
        container.className = 'match_following_container mt-3';
        container.setAttribute('data-question-id', questionId);
        
        // Create basic structure
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header bg-light">Items</div>
                        <div class="card-body p-2 left-items"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header bg-light">Match With</div>
                        <div class="card-body p-2 right-items"></div>
                    </div>
                </div>
            </div>
            <div class="text-muted small mb-3">
                Drag items from left column to match with items on right.
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
            <div class="match-status"></div>
        `;
        
        // Add to question
        question.appendChild(container);
        
        // Add sample items
        addSampleItems(container, questionId);
        
        // Setup drag and drop
        setupDragAndDrop(container);
    }
    
    // Add sample items to container
    function addSampleItems(container, questionId) {
        var leftContainer = container.querySelector('.left-items');
        var rightContainer = container.querySelector('.right-items');
        
        if (!leftContainer || !rightContainer) return;
        
        // Sample items
        var pairs = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        // Add left items
        pairs.forEach(function(pair) {
            var item = document.createElement('div');
            item.className = 'match-item mb-2 p-2 border rounded bg-white';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-pair-id', pair.id);
            item.textContent = pair.left;
            leftContainer.appendChild(item);
        });
        
        // Add right items (shuffled)
        shuffle(pairs).forEach(function(pair) {
            var item = document.createElement('div');
            item.className = 'match-item mb-2 p-2 border rounded bg-white';
            item.setAttribute('data-pair-id', pair.id);
            item.textContent = pair.right;
            rightContainer.appendChild(item);
        });
    }
    
    // Setup drag and drop functionality
    function setupDragAndDrop(container) {
        // Setup drag for left items
        var leftItems = container.querySelectorAll('.left-items .match-item');
        for (var i = 0; i < leftItems.length; i++) {
            var item = leftItems[i];
            
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
                
                var activeDropZones = document.querySelectorAll('.drop-active');
                for (var j = 0; j < activeDropZones.length; j++) {
                    activeDropZones[j].classList.remove('drop-active');
                }
            });
        }
        
        // Setup drop for right items
        var rightItems = container.querySelectorAll('.right-items .match-item');
        for (var k = 0; k < rightItems.length; k++) {
            var target = rightItems[k];
            
            // Allow drops
            target.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-active');
            });
            
            // Reset styling
            target.addEventListener('dragleave', function() {
                this.classList.remove('drop-active');
            });
            
            // Handle drop
            target.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-active');
                
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
                    
                    // Save match
                    saveMatches(container);
                } else {
                    // Wrong match - show feedback
                    this.style.backgroundColor = '#f8d7da';
                    this.style.borderColor = '#f5c6cb';
                    
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = '';
                        self.style.borderColor = '';
                    }, 1000);
                }
            });
        }
    }
    
    // Save matches to server
    function saveMatches(container) {
        var questionId = container.getAttribute('data-question-id');
        var surveyToken = getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.log('Match Following: Missing question ID or survey token');
            return;
        }
        
        // Collect matched items
        var matches = [];
        var matchedItems = container.querySelectorAll('.left-items .match-item[data-matched="true"]');
        for (var i = 0; i < matchedItems.length; i++) {
            var item = matchedItems[i];
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        }
        
        // Update hidden input
        var input = container.querySelector('input[name="question_' + questionId + '"]');
        if (input) {
            input.value = JSON.stringify(matches);
        }
        
        // Send to server
        submitMatches(surveyToken, questionId, matches);
        
        // Update UI
        updateStatus(container, matches.length);
    }
    
    // Submit matches to server
    function submitMatches(surveyToken, questionId, matches) {
        console.log('Match Following: Submitting matches to server');
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Match Following: Submission successful');
                } else {
                    console.error('Match Following: Submission failed with status ' + xhr.status);
                }
            }
        };
        
        var data = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: matches
            },
            id: new Date().getTime()
        };
        
        xhr.send(JSON.stringify(data));
    }
    
    // Update status display
    function updateStatus(container, matchCount) {
        var statusElem = container.querySelector('.match-status');
        if (!statusElem) return;
        
        var totalItems = container.querySelectorAll('.left-items .match-item').length;
        
        if (matchCount === totalItems) {
            // All items matched correctly
            statusElem.innerHTML = '<div class="alert alert-success py-2">All items matched correctly!</div>';
            
            // Find next button
            var nextBtn = document.querySelector('.o_survey_form button[type="submit"]');
            if (nextBtn) {
                nextBtn.focus();
            }
        } else {
            // Show progress
            statusElem.innerHTML = '<div class="text-muted">' + matchCount + ' of ' + totalItems + ' items matched</div>';
        }
    }
    
    // Get question ID from element
    function getQuestionId(questionElem) {
        // Try data attribute
        var id = questionElem.getAttribute('data-question-id');
        if (id) return id;
        
        // Try element ID
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
        
        // Generate random ID
        return 'q_' + Math.floor(Math.random() * 10000);
    }
    
    // Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/);
                    
        if (match && match[1]) {
            return match[1];
        }
        
        // Try to find token input
        var tokenInput = document.querySelector('input[name="token"]');
        if (tokenInput) {
            return tokenInput.value;
        }
        
        return null;
    }
    
    // Setup observer to watch for dynamically added questions
    function setupMutationObserver() {
        var target = document.querySelector('.o_survey_form_content');
        if (!target) return;
        
        var observer = new MutationObserver(function(mutations) {
            var shouldCheck = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                setTimeout(findAndProcessQuestions, 500);
            }
        });
        
        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }
    
    // Add CSS styles
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = `
            .match_following_container {
                margin: 15px 0;
                padding: 15px;
                background-color: #f9f9fa;
                border-radius: 4px;
            }
            .left-items, .right-items {
                min-height: 150px;
                background-color: #fff;
            }
            .match-item {
                transition: all 0.2s ease;
                cursor: pointer;
            }
            .left-items .match-item {
                cursor: grab;
            }
            .match-item.matched {
                background-color: #d4edda !important;
                border-color: #c3e6cb !important;
            }
            .drop-active {
                background-color: #e8f4ff !important;
                border-color: #b8daff !important;
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