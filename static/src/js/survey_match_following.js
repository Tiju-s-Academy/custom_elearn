odoo.define('custom_elearn.survey_match_following', function (require) {
    'use strict';
    
    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');
    var _t = core._t;
    
    // Register our widget
    publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
        selector: '.js_question-wrapper',
        events: {
            'dragstart .o_match_item': '_onDragStart',
            'dragend .o_match_item': '_onDragEnd',
            'dragover .o_match_questions, .o_match_answers': '_onDragOver',
            'dragleave .o_match_questions, .o_match_answers': '_onDragLeave',
            'drop .o_match_questions, .o_match_answers': '_onDrop'
        },
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                // Check if this is a match following question
                var questionType = self.$el.find('input[name="question_type"]').val();
                if (questionType === 'match_following') {
                    return self._initMatchFollowing();
                }
                return Promise.resolve();
            });
        },
        
        //----------------------------------------------------------------------
        // Private
        //----------------------------------------------------------------------
        
        /**
         * Initialize match following for this question
         */
        _initMatchFollowing: function () {
            var self = this;
            
            // First check if UI is already created
            if (this.$el.find('.match_following_container').length) {
                return Promise.resolve();
            }
            
            // Get question ID
            var questionId = this._getQuestionId();
            if (!questionId) {
                console.warn("Match Following: Could not determine question ID");
                return Promise.resolve();
            }
            
            // Create UI
            return this._createMatchFollowingUI(questionId).then(function () {
                self._setupDragDrop();
                return Promise.resolve();
            });
        },
        
        /**
         * Get the question ID
         */
        _getQuestionId: function () {
            var $input = this.$el.find('input[name^="question_"]');
            if ($input.length) {
                var match = $input.attr('name').match(/question_(\d+)/);
                if (match && match[1]) {
                    return match[1];
                }
            }
            return '';
        },
        
        /**
         * Create match following UI
         */
        _createMatchFollowingUI: function (questionId) {
            var self = this;
            
            // Create container
            var $container = $('<div>', {
                'class': 'match_following_container mt-4',
                'data-question-id': questionId
            });
            
            // Create structure
            var $row = $('<div>', {'class': 'row'});
            
            // Left column
            var $leftCol = $('<div>', {'class': 'col-md-6'});
            var $leftTitle = $('<h5>').text(_t("Items"));
            var $leftZone = $('<div>', {'class': 'o_match_questions p-3 border rounded'});
            $leftCol.append($leftTitle, $leftZone);
            
            // Right column
            var $rightCol = $('<div>', {'class': 'col-md-6'});
            var $rightTitle = $('<h5>').text(_t("Match With"));
            var $rightZone = $('<div>', {'class': 'o_match_answers p-3 border rounded'});
            $rightCol.append($rightTitle, $rightZone);
            
            // Assemble UI
            $row.append($leftCol, $rightCol);
            $container.append($row);
            
            // Add to DOM
            this.$el.append($container);
            
            // Add sample items or fetch real ones
            return this._getMatchItems(questionId).then(function (items) {
                if (!items || !items.length) {
                    // Add sample items
                    self._addSampleItems($container);
                } else {
                    // Add real items
                    self._addItems($container, items);
                }
                return Promise.resolve();
            });
        },
        
        /**
         * Get match items from backend (stub - would connect to API)
         */
        _getMatchItems: function (questionId) {
            // For now just return empty, we'll use sample data
            return Promise.resolve([]);
        },
        
        /**
         * Add sample items for testing
         */
        _addSampleItems: function ($container) {
            var questionId = $container.data('question-id');
            var items = [
                { id: 'item1_' + questionId, left: 'Apple', right: 'Fruit' },
                { id: 'item2_' + questionId, left: 'Dog', right: 'Animal' },
                { id: 'item3_' + questionId, left: 'Car', right: 'Vehicle' }
            ];
            
            var $leftZone = $container.find('.o_match_questions');
            var $rightZone = $container.find('.o_match_answers');
            
            _.each(items, function(item) {
                // Create left item
                var $leftItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'draggable': true,
                    'data-pair-id': item.id,
                    'text': item.left
                });
                $leftZone.append($leftItem);
                
                // Create right item
                var $rightItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'data-pair-id': item.id,
                    'text': item.right
                });
                $rightZone.append($rightItem);
            });
        },
        
        /**
         * Add real items from data
         */
        _addItems: function ($container, items) {
            var $leftZone = $container.find('.o_match_questions');
            var $rightZone = $container.find('.o_match_answers');
            
            _.each(items, function(item) {
                // Create left item
                var $leftItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'draggable': true,
                    'data-pair-id': item.id,
                    'text': item.left_option
                });
                $leftZone.append($leftItem);
                
                // Create right item
                var $rightItem = $('<div>', {
                    'class': 'o_match_item mb-2 p-2 border rounded',
                    'data-pair-id': item.id,
                    'text': item.right_option
                });
                $rightZone.append($rightItem);
            });
        },
        
        /**
         * Set up drag and drop functionality
         */
        _setupDragDrop: function() {
            this.$('.o_match_item').attr('draggable', true);
        },
        
        /**
         * Update the matches and submit to server
         */
        _updateMatches: function() {
            var self = this;
            var $container = this.$('.match_following_container');
            var questionId = $container.data('question-id');
            var matches = [];
            
            $container.find('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
                matches.push({
                    pair_id: $(this).data('pair-id'),
                    matched: true
                });
            });
            
            // Get the survey token
            var surveyToken = this._getSurveyToken();
            if (!surveyToken || !questionId) {
                return Promise.reject();
            }
            
            // Submit to server using Odoo's ajax
            return ajax.jsonRpc('/survey/submit/' + surveyToken + '/' + questionId, 'call', {
                value_match_following: matches
            }).then(function(result) {
                if (result && result.success) {
                    // Update UI to show success
                    self._markSuccess();
                }
                return Promise.resolve(result);
            });
        },
        
        /**
         * Mark the UI as successful
         */
        _markSuccess: function() {
            // Could add visual feedback here
        },
        
        /**
         * Get survey token from URL
         */
        _getSurveyToken: function() {
            var url = window.location.href;
            var match = url.match(/\/survey\/([^\/]+)/) || 
                       url.match(/\/begin\/([^\/]+)/) || 
                       url.match(/\/start\/([^\/]+)/);
            
            return match ? match[1] : null;
        },
        
        //----------------------------------------------------------------------
        // Handlers
        //----------------------------------------------------------------------
        
        /**
         * Handle drag start
         */
        _onDragStart: function(ev) {
            ev.originalEvent.dataTransfer.setData('text/plain', $(ev.currentTarget).data('pair-id'));
            $(ev.currentTarget).addClass('dragging');
        },
        
        /**
         * Handle drag end
         */
        _onDragEnd: function(ev) {
            $(ev.currentTarget).removeClass('dragging');
            this.$('.drop-zone-active').removeClass('drop-zone-active');
        },
        
        /**
         * Handle drag over
         */
        _onDragOver: function(ev) {
            ev.preventDefault();
            $(ev.currentTarget).addClass('drop-zone-active');
        },
        
        /**
         * Handle drag leave
         */
        _onDragLeave: function(ev) {
            $(ev.currentTarget).removeClass('drop-zone-active');
        },
        
        /**
         * Handle drop
         */
        _onDrop: function(ev) {
            ev.preventDefault();
            
            var self = this;
            var $dropZone = $(ev.currentTarget);
            $dropZone.removeClass('drop-zone-active');
            
            var pairId = ev.originalEvent.dataTransfer.getData('text/plain');
            
            if ($dropZone.hasClass('o_match_answers')) {
                // Mark question item as matched
                var $questionItem = this.$('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
                $questionItem.attr('data-matched', 'true').addClass('matched');
                
                // Mark answer item as matched
                var $answerItem = this.$('.o_match_answers .o_match_item[data-pair-id="' + pairId + '"]');
                $answerItem.addClass('matched');
                
                // Update matches
                this._updateMatches().then(function() {
                    // Success handling
                }).guardedCatch(function(error) {
                    console.error("Match Following: Error submitting matches", error);
                });
            }
        }
    });
    
    return {
        SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
    };
});

/**
 * Match Following implementation for Odoo surveys
 * Designed to work with Odoo's survey navigation system
 */
(function() {
    'use strict';
    
    // Debug version of Match Following
    // With extensive logging to diagnose issues
    window.matchFollowingDebug = {
        initialized: false,
        lastError: null,
        getState: function() {
            return {
                initialized: this.initialized,
                lastError: this.lastError,
                questions: document.querySelectorAll('.js_question-wrapper, .o_survey_form .js_question').length,
                matchFollowingQuestions: document.querySelectorAll('.match_following_container').length,
                url: window.location.href,
                surveyToken: getSurveyToken()
            };
        },
        testSubmit: function() {
            // Manual test submission
            var container = document.querySelector('.match_following_container');
            if (!container) {
                console.error('No match following container found');
                return;
            }
            var questionId = container.getAttribute('data-question-id');
            if (!questionId) {
                console.error('No question ID found in container');
                return;
            }
            forceSaveMatches(container);
        },
        forceInit: function() {
            initMatchFollowing(true);
        }
    };
    
    // Initialize when document is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("[Match Following DEBUG] Document loaded, waiting to initialize...");
        
        // Add debug panel
        addDebugPanel();
        
        // Use multiple timeouts to ensure we don't miss the right moment
        setTimeout(function() { initMatchFollowing(); }, 1000);
        setTimeout(function() { initMatchFollowing(); }, 2000);
        setTimeout(function() { initMatchFollowing(); }, 4000);
    });
    
    // Add debug panel to the page
    function addDebugPanel() {
        try {
            var panel = document.createElement('div');
            panel.id = 'match-following-debug-panel';
            panel.style.position = 'fixed';
            panel.style.bottom = '10px';
            panel.style.right = '10px';
            panel.style.zIndex = '9999';
            panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            panel.style.color = 'white';
            panel.style.padding = '10px';
            panel.style.borderRadius = '5px';
            panel.style.fontSize = '12px';
            panel.style.maxWidth = '300px';
            
            panel.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">Match Following Debug</div>
                <div id="match-following-debug-log" style="max-height: 150px; overflow-y: auto;"></div>
                <div style="margin-top: 5px;">
                    <button id="match-following-debug-init" style="background: #007bff; color: white; border: none; padding: 3px 8px; border-radius: 3px; margin-right: 5px;">Force Init</button>
                    <button id="match-following-debug-test" style="background: #28a745; color: white; border: none; padding: 3px 8px; border-radius: 3px;">Test Submit</button>
                </div>
            `;
            
            document.body.appendChild(panel);
            
            // Add event handlers
            document.getElementById('match-following-debug-init').addEventListener('click', function() {
                logDebug('Manual initialization triggered');
                initMatchFollowing(true);
            });
            
            document.getElementById('match-following-debug-test').addEventListener('click', function() {
                logDebug('Manual test submit triggered');
                window.matchFollowingDebug.testSubmit();
            });
        } catch (e) {
            console.error('Error adding debug panel:', e);
        }
    }
    
    // Log to debug panel
    function logDebug(message) {
        console.log('[Match Following DEBUG] ' + message);
        
        try {
            var logElem = document.getElementById('match-following-debug-log');
            if (logElem) {
                var entry = document.createElement('div');
                entry.textContent = message;
                entry.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
                entry.style.paddingBottom = '3px';
                entry.style.marginBottom = '3px';
                logElem.appendChild(entry);
                
                // Scroll to bottom
                logElem.scrollTop = logElem.scrollHeight;
            }
        } catch (e) {
            console.error('Error writing to debug log:', e);
        }
    }
    
    // Initialize match following questions
    function initMatchFollowing(force = false) {
        try {
            // Skip if already initialized and not forced
            if (window.matchFollowingDebug.initialized && !force) {
                logDebug('Initialization skipped - already initialized');
                return;
            }
            
            logDebug('Initializing match following...');
            
            // Check if we're on a survey page
            if (!document.querySelector('.o_survey_form')) {
                logDebug('Not on a survey page - aborting');
                return;
            }
            
            // Find potential match following questions
            var questionCount = findAndProcessMatchFollowingQuestions();
            
            // Set initialized flag
            window.matchFollowingDebug.initialized = questionCount > 0;
            
            // Monitor for future AJAX changes
            setupMutationObserver();
            
            logDebug(`Initialization complete - processed ${questionCount} questions`);
        } catch (e) {
            logDebug('ERROR during initialization: ' + e.message);
            window.matchFollowingDebug.lastError = e;
            console.error('Match Following initialization error:', e);
        }
    }
    
    // Find and process match following questions
    function findAndProcessMatchFollowingQuestions() {
        var count = 0;
        
        // Try different selectors to find question wrappers
        var selectors = [
            '.js_question-wrapper', 
            '.o_survey_form .js_question',
            '.o_survey_form_content .question-container',
            '.o_survey_form_content div[id^="survey_question_"]'
        ];
        
        for (var i = 0; i < selectors.length; i++) {
            var questionWrappers = document.querySelectorAll(selectors[i]);
            logDebug(`Found ${questionWrappers.length} question wrappers using selector: ${selectors[i]}`);
            
            // Process each question wrapper
            for (var j = 0; j < questionWrappers.length; j++) {
                var wrapper = questionWrappers[j];
                
                // Skip if already processed
                if (wrapper.getAttribute('data-match-following-processed')) {
                    logDebug('Skipping already processed question');
                    continue;
                }
                
                // Check question type
                var questionId = getQuestionId(wrapper);
                var questionType = getQuestionType(wrapper);
                
                logDebug(`Question ${j+1}: ID=${questionId}, Type=${questionType}`);
                
                if (questionType === 'match_following') {
                    count++;
                    logDebug(`Processing match following question ${questionId}`);
                    processMatchFollowingQuestion(wrapper, questionId);
                }
            }
        }
        
        return count;
    }
    
    // Get question type
    function getQuestionType(wrapper) {
        // Try to find type input
        var typeInput = wrapper.querySelector('input[name="question_type"]');
        if (typeInput) {
            return typeInput.value;
        }
        
        // Try data attribute
        var type = wrapper.getAttribute('data-question-type');
        if (type) {
            return type;
        }
        
        // Check for match_following container (maybe already partially processed)
        if (wrapper.querySelector('.match_following_container')) {
            return 'match_following';
        }
        
        return 'unknown';
    }
    
    // Get question ID
    function getQuestionId(wrapper) {
        // Try data attribute
        var id = wrapper.getAttribute('data-question-id');
        if (id) {
            return id;
        }
        
        // Try id attribute with format survey_question_X
        if (wrapper.id && wrapper.id.match(/survey_question_(\d+)/)) {
            return wrapper.id.match(/survey_question_(\d+)/)[1];
        }
        
        // Try to find from input names
        var inputs = wrapper.querySelectorAll('input[name^="question_"]');
        if (inputs.length > 0) {
            var match = inputs[0].name.match(/question_(\d+)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // Try to find question ID in the URL
        var urlMatch = window.location.href.match(/\/question\/(\d+)/);
        if (urlMatch && urlMatch[1]) {
            return urlMatch[1];
        }
        
        return null;
    }
    
    // Process a match following question
    function processMatchFollowingQuestion(wrapper, questionId) {
        try {
            // Mark as processed
            wrapper.setAttribute('data-match-following-processed', 'true');
            
            logDebug(`Creating match following interface for question ${questionId}`);
            
            // Create container
            var container = document.createElement('div');
            container.className = 'match_following_container';
            container.setAttribute('data-question-id', questionId);
            
            // Create HTML structure
            container.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header">Items</div>
                            <div class="card-body left-items"></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-3">
                            <div class="card-header">Match With</div>
                            <div class="card-body right-items"></div>
                        </div>
                    </div>
                </div>
                <div class="text-muted mb-3">
                    <small>Drag items from left column to match with right column</small>
                </div>
                <input type="hidden" name="question_${questionId}" value="[]">
            `;
            
            // Add to wrapper
            wrapper.appendChild(container);
            
            // Add sample pairs
            addSamplePairs(container, questionId);
            
            // Setup drag and drop
            setupDragDrop(container);
            
            logDebug('Match following UI created successfully');
        } catch (e) {
            logDebug('ERROR: Failed to process question: ' + e.message);
            console.error('Failed to process match following question:', e);
        }
    }
    
    // Add sample pairs
    function addSamplePairs(container, questionId) {
        var leftContainer = container.querySelector('.left-items');
        var rightContainer = container.querySelector('.right-items');
        
        if (!leftContainer || !rightContainer) {
            logDebug('ERROR: Could not find item containers');
            return;
        }
        
        var pairs = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        logDebug(`Adding ${pairs.length} sample pairs to question ${questionId}`);
        
        // Add left items
        for (var i = 0; i < pairs.length; i++) {
            var item = pairs[i];
            
            var leftItem = document.createElement('div');
            leftItem.className = 'match-item mb-2 p-2 border rounded bg-white';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', item.id);
            leftItem.textContent = item.left;
            leftContainer.appendChild(leftItem);
        }
        
        // Add right items (shuffled)
        var shuffledPairs = shuffle(pairs.slice());
        for (var j = 0; j < shuffledPairs.length; j++) {
            var shuffledItem = shuffledPairs[j];
            
            var rightItem = document.createElement('div');
            rightItem.className = 'match-item mb-2 p-2 border rounded bg-white';
            rightItem.setAttribute('data-pair-id', shuffledItem.id);
            rightItem.textContent = shuffledItem.right;
            rightContainer.appendChild(rightItem);
        }
    }
    
    // Setup drag and drop functionality
    function setupDragDrop(container) {
        try {
            var leftItems = container.querySelectorAll('.left-items .match-item');
            var rightItems = container.querySelectorAll('.right-items .match-item');
            
            logDebug(`Setting up drag & drop for ${leftItems.length} left items and ${rightItems.length} right items`);
            
            // Make left items draggable
            leftItems.forEach(function(item) {
                // Drag start
                item.addEventListener('dragstart', function(e) {
                    logDebug('Drag started: ' + this.textContent);
                    try {
                        e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                        this.classList.add('dragging');
                        this.style.opacity = '0.5';
                    } catch (e) {
                        logDebug('ERROR in dragstart: ' + e.message);
                    }
                });
                
                // Drag end
                item.addEventListener('dragend', function() {
                    logDebug('Drag ended');
                    this.classList.remove('dragging');
                    this.style.opacity = '';
                });
            });
            
            // Setup right items as drop targets
            rightItems.forEach(function(item) {
                // Allow drop
                item.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    this.classList.add('drop-active');
                    this.style.backgroundColor = '#e8f4ff';
                });
                
                // Remove hover effect
                item.addEventListener('dragleave', function() {
                    this.classList.remove('drop-active');
                    this.style.backgroundColor = '';
                });
                
                // Handle drop
                item.addEventListener('drop', function(e) {
                    e.preventDefault();
                    logDebug('Item dropped');
                    
                    this.classList.remove('drop-active');
                    this.style.backgroundColor = '';
                    
                    try {
                        var pairId = e.dataTransfer.getData('text/plain');
                        logDebug('Drop data: ' + pairId);
                        
                        if (!pairId) {
                            logDebug('ERROR: No pair ID in dropped data');
                            return;
                        }
                        
                        // Check if correct match
                        if (this.getAttribute('data-pair-id') === pairId) {
                            logDebug('Correct match!');
                            
                            // Mark as matched
                            this.classList.add('matched');
                            this.style.backgroundColor = '#d4edda';
                            
                            // Find and mark left item
                            var leftItem = container.querySelector(`.left-items .match-item[data-pair-id="${pairId}"]`);
                            if (leftItem) {
                                leftItem.classList.add('matched');
                                leftItem.style.backgroundColor = '#d4edda';
                                leftItem.setAttribute('data-matched', 'true');
                            }
                            
                            // Save matches
                            saveMatches(container);
                        } else {
                            logDebug('Incorrect match');
                            
                            // Show error
                            this.style.backgroundColor = '#f8d7da';
                            var self = this;
                            setTimeout(function() {
                                self.style.backgroundColor = '';
                            }, 1000);
                        }
                    } catch (e) {
                        logDebug('ERROR in drop handler: ' + e.message);
                    }
                });
            });
            
            logDebug('Drag and drop setup complete');
        } catch (e) {
            logDebug('ERROR in setupDragDrop: ' + e.message);
            console.error('Error setting up drag and drop:', e);
        }
    }
    
    // Save matches 
    function saveMatches(container) {
        try {
            var questionId = container.getAttribute('data-question-id');
            if (!questionId) {
                logDebug('ERROR: No question ID found on container');
                return;
            }
            
            var surveyToken = getSurveyToken();
            if (!surveyToken) {
                logDebug('ERROR: Could not determine survey token');
                return;
            }
            
            // Get matched items
            var matches = [];
            var matchedItems = container.querySelectorAll('.left-items .match-item[data-matched="true"]');
            
            matchedItems.forEach(function(item) {
                matches.push({
                    pair_id: item.getAttribute('data-pair-id'),
                    matched: true
                });
            });
            
            logDebug(`Saving ${matches.length} matches for question ${questionId}`);
            
            // Submit to server
            submitMatchesToServer(surveyToken, questionId, matches);
            
        } catch (e) {
            logDebug('ERROR in saveMatches: ' + e.message);
            console.error('Error saving matches:', e);
        }
    }
    
    // Force save matches (for debug)
    function forceSaveMatches(container) {
        try {
            var questionId = container.getAttribute('data-question-id');
            if (!questionId) {
                logDebug('ERROR: No question ID found on container');
                return;
            }
            
            var surveyToken = getSurveyToken();
            if (!surveyToken) {
                logDebug('ERROR: Could not determine survey token');
                return;
            }
            
            // Create a test match
            var matches = [{
                pair_id: 'test_pair_' + Date.now(),
                matched: true
            }];
            
            logDebug(`Force submitting test match for question ${questionId}`);
            
            // Submit to server
            submitMatchesToServer(surveyToken, questionId, matches);
            
        } catch (e) {
            logDebug('ERROR in forceSaveMatches: ' + e.message);
        }
    }
    
    // Submit matches to server
    function submitMatchesToServer(surveyToken, questionId, matches) {
        try {
            logDebug(`Submitting to /survey/submit/${surveyToken}/${questionId}`);
            logDebug('Match data: ' + JSON.stringify(matches));
            
            // Use both XHR and Fetch to see which works
            
            // Method 1: XMLHttpRequest
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    logDebug(`XHR response status: ${xhr.status}`);
                    if (xhr.status === 200) {
                        try {
                            var resp = JSON.parse(xhr.responseText);
                            logDebug('XHR response: ' + JSON.stringify(resp));
                        } catch (e) {
                            logDebug('XHR parse error: ' + e.message);
                            logDebug('Raw response: ' + xhr.responseText);
                        }
                    } else {
                        logDebug('XHR error status: ' + xhr.status);
                    }
                }
            };
            
            // Format data exactly as expected by server
            var data = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    value_match_following: matches
                },
                id: Date.now()
            };
            
            xhr.send(JSON.stringify(data));
            
            // Method 2: Fetch API (as backup)
            fetch('/survey/submit/' + surveyToken + '/' + questionId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        value_match_following: matches
                    },
                    id: Date.now() + 1
                })
            })
            .then(function(response) {
                logDebug(`Fetch response status: ${response.status}`);
                return response.json();
            })
            .then(function(data) {
                logDebug('Fetch response: ' + JSON.stringify(data));
            })
            .catch(function(error) {
                logDebug('Fetch error: ' + error.message);
            });
            
        } catch (e) {
            logDebug('ERROR in submitMatchesToServer: ' + e.message);
            console.error('Error submitting matches to server:', e);
        }
    }
    
    // Set up mutation observer to monitor DOM changes
    function setupMutationObserver() {
        try {
            // Find the survey content container
            var content = document.querySelector('.o_survey_form_content');
            if (!content) {
                logDebug('Could not find survey content container for mutation observer');
                return;
            }
            
            logDebug('Setting up mutation observer');
            
            // Create observer
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    // Check for added nodes
                    if (mutation.addedNodes.length > 0) {
                        logDebug('Detected DOM changes - checking for new questions');
                        // Delay to make sure DOM is fully updated
                        setTimeout(function() {
                            findAndProcessMatchFollowingQuestions();
                        }, 500);
                    }
                });
            });
            
            // Start observing
            observer.observe(content, {
                childList: true,
                subtree: true
            });
            
        } catch (e) {
            logDebug('ERROR setting up mutation observer: ' + e.message);
        }
    }
    
    // Get survey token
    function getSurveyToken() {
        try {
            var url = window.location.href;
            var match = url.match(/\/survey\/([^\/]+)/) || 
                        url.match(/\/begin\/([^\/]+)/);
                        
            if (match && match[1]) {
                return match[1];
            }
            
            // Try to find in DOM
            var tokenInput = document.querySelector('input[name="token"]');
            if (tokenInput) {
                return tokenInput.value;
            }
            
            logDebug('Could not determine survey token');
            return null;
        } catch (e) {
            logDebug('ERROR getting survey token: ' + e.message);
            return null;
        }
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