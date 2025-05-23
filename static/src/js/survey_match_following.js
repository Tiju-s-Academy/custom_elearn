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
    
    // Initialize when document is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Document loaded");
        
        // Use timeout to make sure Odoo's JS is loaded first
        setTimeout(function() {
            initMatchFollowing();
            
            // Also monitor for AJAX page changes in survey
            monitorSurveyChanges();
        }, 1000);
    });
    
    // Initialize match following on current page
    function initMatchFollowing() {
        try {
            console.log("Match Following: Initializing...");
            
            // Find and process match following questions
            var questions = findMatchFollowingQuestions();
            
            if (questions.length === 0) {
                console.log("Match Following: No match following questions found");
                return;
            }
            
            console.log(`Match Following: Found ${questions.length} match following questions`);
            
            // Process each match following question
            questions.forEach(function(question) {
                processMatchFollowingQuestion(question);
            });
            
        } catch (error) {
            console.error("Match Following error:", error);
        }
    }
    
    // Find match following questions on the page
    function findMatchFollowingQuestions() {
        var matchFollowingQuestions = [];
        
        // Look for question wrappers
        var questionWrappers = document.querySelectorAll('.js_question-wrapper, .o_survey_form .js_question');
        
        // Check each for match following type
        questionWrappers.forEach(function(wrapper) {
            // Check if already processed
            if (wrapper.getAttribute('data-match-following-processed')) {
                return;
            }
            
            // Check question type
            var questionType = '';
            var typeInput = wrapper.querySelector('input[name="question_type"]');
            if (typeInput) {
                questionType = typeInput.value;
            }
            
            if (questionType === 'match_following') {
                matchFollowingQuestions.push(wrapper);
            }
        });
        
        return matchFollowingQuestions;
    }
    
    // Process a match following question
    function processMatchFollowingQuestion(questionWrapper) {
        // Mark as processed to avoid duplicates
        questionWrapper.setAttribute('data-match-following-processed', 'true');
        
        // Get question ID
        var questionId = getQuestionId(questionWrapper);
        if (!questionId) {
            console.error("Match Following: Could not determine question ID");
            return;
        }
        
        console.log(`Match Following: Processing question ${questionId}`);
        
        // Create match following container
        var container = createMatchFollowingContainer(questionWrapper, questionId);
        
        // Add sample pairs
        addMatchingPairs(container, questionId);
        
        // Setup drag and drop
        setupDragDrop(container);
    }
    
    // Create match following container
    function createMatchFollowingContainer(wrapper, questionId) {
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Add HTML structure
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
            <div class="form-text text-muted mb-3">
                Drag items from the left column to match with items in the right column.
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
        `;
        
        // Add to wrapper
        wrapper.appendChild(container);
        
        return container;
    }
    
    // Add sample matching pairs to container
    function addMatchingPairs(container, questionId) {
        var leftContainer = container.querySelector('.left-items');
        var rightContainer = container.querySelector('.right-items');
        
        // Sample data - in a real implementation, this would come from the server
        var items = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' },
            { id: 'pair4_' + questionId, left: 'Python', right: 'Programming Language' },
        ];
        
        // Shuffle right items for more challenge
        var rightItems = shuffleArray(items.slice());
        
        // Add left items
        items.forEach(function(item) {
            var leftItem = document.createElement('div');
            leftItem.className = 'match-item mb-2 p-2 border rounded bg-white';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', item.id);
            leftItem.textContent = item.left;
            leftContainer.appendChild(leftItem);
        });
        
        // Add right items (shuffled)
        rightItems.forEach(function(item) {
            var rightItem = document.createElement('div');
            rightItem.className = 'match-item mb-2 p-2 border rounded bg-white';
            rightItem.setAttribute('data-pair-id', item.id);
            rightItem.textContent = item.right;
            rightContainer.appendChild(rightItem);
        });
    }
    
    // Set up drag and drop functionality
    function setupDragDrop(container) {
        // Get draggable items (left column)
        var draggableItems = container.querySelectorAll('.left-items .match-item');
        
        // Setup drag events
        draggableItems.forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            });
            
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                this.style.opacity = '';
                
                // Remove active styling from drop zones
                container.querySelectorAll('.drop-active').forEach(function(el) {
                    el.classList.remove('drop-active');
                    el.style.backgroundColor = '';
                });
            });
        });
        
        // Setup drop targets (right column)
        var dropTargets = container.querySelectorAll('.right-items .match-item');
        
        dropTargets.forEach(function(target) {
            // Allow drop
            target.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drop-active');
                this.style.backgroundColor = '#e8f4ff';
            });
            
            // Reset style on leave
            target.addEventListener('dragleave', function() {
                this.classList.remove('drop-active');
                this.style.backgroundColor = '';
            });
            
            // Handle drop
            target.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drop-active');
                this.style.backgroundColor = '';
                
                var pairId = e.dataTransfer.getData('text/plain');
                if (!pairId) return;
                
                // Check if correct match
                if (this.getAttribute('data-pair-id') === pairId) {
                    // Correct match!
                    this.classList.add('matched');
                    this.style.backgroundColor = '#d4edda';
                    this.style.borderColor = '#c3e6cb';
                    
                    // Find and mark the left item
                    var leftItem = container.querySelector(`.left-items .match-item[data-pair-id="${pairId}"]`);
                    if (leftItem) {
                        leftItem.classList.add('matched');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.style.borderColor = '#c3e6cb';
                        leftItem.setAttribute('data-matched', 'true');
                    }
                    
                    // Update matches
                    saveMatches(container);
                    
                    // Check if all matches are complete
                    checkAllMatched(container);
                } else {
                    // Incorrect match - show brief error
                    this.style.backgroundColor = '#f8d7da';
                    this.style.borderColor = '#f5c6cb';
                    
                    // Reset after a moment
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = '';
                        self.style.borderColor = '';
                    }, 800);
                }
            });
        });
    }
    
    // Save matches to hidden input and submit to server
    function saveMatches(container) {
        var questionId = container.getAttribute('data-question-id');
        if (!questionId) return;
        
        // Get survey token
        var surveyToken = getSurveyToken();
        if (!surveyToken) {
            console.error("Match Following: Could not determine survey token");
            return;
        }
        
        // Collect all matched pairs
        var matches = [];
        var matchedItems = container.querySelectorAll('.left-items .match-item[data-matched="true"]');
        
        matchedItems.forEach(function(item) {
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        });
        
        // Update hidden input
        var hiddenInput = container.querySelector(`input[name="question_${questionId}"]`);
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(matches);
        }
        
        console.log(`Match Following: Saving ${matches.length} matches for question ${questionId}`);
        
        // Send to server
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/survey/submit/' + surveyToken + '/' + questionId, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log("Match Following: Saved successfully");
                } else {
                    console.error("Match Following: Error saving matches");
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
            id: new Date().getTime()
        };
        
        xhr.send(JSON.stringify(data));
    }
    
    // Check if all items are matched and show complete message
    function checkAllMatched(container) {
        var totalItems = container.querySelectorAll('.left-items .match-item').length;
        var matchedItems = container.querySelectorAll('.left-items .match-item[data-matched="true"]').length;
        
        if (totalItems > 0 && totalItems === matchedItems) {
            // All items matched!
            console.log("Match Following: All items matched!");
            
            // Find or create status message
            var statusElem = container.querySelector('.match-status');
            if (!statusElem) {
                statusElem = document.createElement('div');
                statusElem.className = 'match-status alert alert-success mt-3';
                container.appendChild(statusElem);
            }
            
            statusElem.textContent = 'All items matched correctly!';
            
            // Find next button if exists
            var nextButton = document.querySelector('.o_survey_form button[type="submit"]');
            if (nextButton) {
                // Highlight the next button
                nextButton.classList.add('btn-primary');
                nextButton.classList.remove('btn-secondary');
                
                // Add a little message to encourage proceeding
                var helpText = document.createElement('div');
                helpText.className = 'text-muted mt-2';
                helpText.textContent = 'Click "Next" to continue to the next question.';
                container.appendChild(helpText);
            }
        }
    }
    
    // Monitor for survey page changes (AJAX)
    function monitorSurveyChanges() {
        // Try to find the survey form content container
        var surveyContent = document.querySelector('.o_survey_form_content');
        if (!surveyContent) return;
        
        // Create a mutation observer to watch for DOM changes
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // Check if nodes were added
                if (mutation.addedNodes.length > 0) {
                    // Check if any of the added nodes might be a question
                    Array.from(mutation.addedNodes).forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // If this might be a question wrapper or contains one
                            if (node.classList && (
                                node.classList.contains('js_question-wrapper') || 
                                node.classList.contains('js_question') ||
                                node.querySelector('.js_question-wrapper, .js_question')
                            )) {
                                console.log("Match Following: Detected new question added");
                                // Initialize match following after a brief delay
                                setTimeout(initMatchFollowing, 300);
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing
        observer.observe(surveyContent, {
            childList: true,
            subtree: true
        });
        
        console.log("Match Following: Monitoring survey for changes");
    }
    
    // Helper: Get question ID
    function getQuestionId(wrapper) {
        // Try data attribute
        var id = wrapper.getAttribute('data-question-id');
        
        // Try input name
        if (!id) {
            var inputs = wrapper.querySelectorAll('input[name^="question_"]');
            
            if (inputs.length > 0) {
                var match = inputs[0].name.match(/question_(\d+)/);
                if (match && match[1]) {
                    id = match[1];
                }
            }
        }
        
        return id;
    }
    
    // Helper: Get survey token from URL
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/) || 
                    url.match(/\/session\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    // Helper: Shuffle array
    function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
})();