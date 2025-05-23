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
 * Simple Match Following implementation for Odoo surveys
 * Uses vanilla JS for maximum compatibility
 */
(function() {
    'use strict';
    
    // Initialize when document is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Document ready");
        // Use a timeout to ensure Odoo's JS is fully loaded
        setTimeout(initialize, 1000);
    });
    
    /**
     * Main initialization function
     */
    function initialize() {
        console.log("Match Following: Initializing");
        
        // Check whether this page contains a survey form
        if (!document.querySelector('.o_survey_form')) {
            console.log("Match Following: No survey form found on this page");
            return;
        }
        
        // Find question containers
        var questionWrappers = document.querySelectorAll('.js_question-wrapper');
        console.log("Match Following: Found " + questionWrappers.length + " question wrappers");
        
        // Process each question
        for (var i = 0; i < questionWrappers.length; i++) {
            processQuestion(questionWrappers[i]);
        }
    }
    
    /**
     * Process a question wrapper to check if it's a match following question
     */
    function processQuestion(wrapper) {
        // Skip if already processed
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
            console.log("Match Following: Found match following question");
            createMatchFollowingUI(wrapper);
            // Mark as processed
            wrapper.setAttribute('data-match-following-processed', 'true');
        }
    }
    
    /**
     * Create match following UI for a question
     */
    function createMatchFollowingUI(wrapper) {
        // Get question ID
        var questionId = '';
        var inputs = wrapper.querySelectorAll('input[name^="question_"]');
        if (inputs.length > 0) {
            var nameMatch = inputs[0].name.match(/question_(\d+)/);
            if (nameMatch && nameMatch[1]) {
                questionId = nameMatch[1];
            }
        }
        
        if (!questionId) {
            console.error("Match Following: Couldn't determine question ID");
            return;
        }
        
        console.log("Match Following: Creating UI for question " + questionId);
        
        // Create container
        var container = document.createElement('div');
        container.className = 'match_following_container';
        container.setAttribute('data-question-id', questionId);
        
        // Create HTML structure
        var html = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Items</h5>
                    <div class="match_left_items bg-light border rounded p-2 mb-2" style="min-height:150px;"></div>
                </div>
                <div class="col-md-6">
                    <h5>Match With</h5>
                    <div class="match_right_items bg-light border rounded p-2 mb-2" style="min-height:150px;"></div>
                </div>
            </div>
            <div class="match_status text-muted small mt-2">
                Drag items from left to match with items on the right.
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add to the wrapper
        wrapper.appendChild(container);
        
        // Add test items
        addTestItems(container);
        
        // Setup drag and drop
        setupDragDrop(container);
    }
    
    /**
     * Add test items to the match following container
     */
    function addTestItems(container) {
        var questionId = container.getAttribute('data-question-id');
        var leftContainer = container.querySelector('.match_left_items');
        var rightContainer = container.querySelector('.match_right_items');
        
        var items = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];
        
        // Create left items
        items.forEach(function(item) {
            var leftItem = document.createElement('div');
            leftItem.className = 'match_item bg-white border rounded p-2 mb-2';
            leftItem.setAttribute('draggable', 'true');
            leftItem.setAttribute('data-pair-id', item.id);
            leftItem.textContent = item.left;
            leftContainer.appendChild(leftItem);
        });
        
        // Create right items (shuffled)
        shuffle(items).forEach(function(item) {
            var rightItem = document.createElement('div');
            rightItem.className = 'match_item bg-white border rounded p-2 mb-2';
            rightItem.setAttribute('data-pair-id', item.id);
            rightItem.textContent = item.right;
            rightContainer.appendChild(rightItem);
        });
    }
    
    /**
     * Set up drag and drop functionality
     */
    function setupDragDrop(container) {
        // Get draggable items
        var dragItems = container.querySelectorAll('.match_left_items .match_item');
        
        // Set up drag events
        dragItems.forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.getAttribute('data-pair-id'));
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            });
            
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                this.style.opacity = '';
            });
        });
        
        // Set up drop targets
        var dropTargets = container.querySelectorAll('.match_right_items .match_item');
        
        dropTargets.forEach(function(target) {
            target.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drag-over');
                this.style.backgroundColor = '#e8f4ff';
            });
            
            target.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
                this.style.backgroundColor = '';
            });
            
            target.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                this.style.backgroundColor = '';
                
                var pairId = e.dataTransfer.getData('text/plain');
                
                // Check if this is the correct match
                if (this.getAttribute('data-pair-id') === pairId) {
                    // Mark as matched
                    this.classList.add('matched');
                    this.style.backgroundColor = '#d4edda';
                    
                    // Find and mark left item
                    var leftItem = container.querySelector(`.match_left_items .match_item[data-pair-id="${pairId}"]`);
                    if (leftItem) {
                        leftItem.classList.add('matched');
                        leftItem.style.backgroundColor = '#d4edda';
                        leftItem.setAttribute('data-matched', 'true');
                    }
                    
                    // Save matches
                    saveMatches(container);
                } else {
                    // Wrong match
                    this.classList.add('wrong-match');
                    this.style.backgroundColor = '#f8d7da';
                    
                    // Reset after a moment
                    var self = this;
                    setTimeout(function() {
                        self.classList.remove('wrong-match');
                        self.style.backgroundColor = '';
                    }, 1000);
                }
            });
        });
    }
    
    /**
     * Save match data to the server
     */
    function saveMatches(container) {
        // Get question ID
        var questionId = container.getAttribute('data-question-id');
        if (!questionId) return;
        
        // Get survey token
        var surveyToken = getSurveyToken();
        if (!surveyToken) return;
        
        // Get matched items
        var matches = [];
        var matchedItems = container.querySelectorAll('.match_left_items .match_item[data-matched="true"]');
        
        matchedItems.forEach(function(item) {
            matches.push({
                pair_id: item.getAttribute('data-pair-id'),
                matched: true
            });
        });
        
        // Update status
        updateMatchStatus(container, matches);
        
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
        
        var data = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                value_match_following: matches
            },
            id: new Date().getTime()
        };
        
        console.log("Match Following: Sending data:", data);
        xhr.send(JSON.stringify(data));
    }
    
    /**
     * Update match status display
     */
    function updateMatchStatus(container, matches) {
        var statusElem = container.querySelector('.match_status');
        if (!statusElem) return;
        
        var total = container.querySelectorAll('.match_left_items .match_item').length;
        var matched = matches.length;
        
        if (matched === total) {
            statusElem.innerHTML = '<div class="alert alert-success py-1 px-2">All items matched correctly!</div>';
        } else {
            statusElem.textContent = matched + ' of ' + total + ' items matched';
        }
    }
    
    /**
     * Get survey token from URL
     */
    function getSurveyToken() {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/);
                    
        return match ? match[1] : null;
    }
    
    /**
     * Shuffle an array
     */
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