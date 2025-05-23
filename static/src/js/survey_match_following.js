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

// Minimal implementation to avoid conflicts
(function() {
    'use strict';
    
    // This function will run when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Match Following: Initializing");
        
        // Wait for Odoo's survey to fully initialize
        setTimeout(function() {
            initMatchFollowing();
        }, 1000);
    });
    
    // Main initialization
    function initMatchFollowing() {
        // Find questions
        var questions = document.querySelectorAll('.js_question-wrapper');
        console.log("Match Following: Found " + questions.length + " questions");
        
        // Process each question
        for (var i = 0; i < questions.length; i++) {
            var question = questions[i];
            var questionType = '';
            
            // Try to get question type
            var typeInput = question.querySelector('input[name="question_type"]');
            if (typeInput) {
                questionType = typeInput.value;
            }
            
            // Process match following questions
            if (questionType === 'match_following') {
                console.log("Match Following: Found match following question");
                
                // Create UI if not exists
                if (!question.querySelector('.match_following_ui')) {
                    createUI(question);
                }
            }
        }
    }
    
    // Create UI for match following question
    function createUI(question) {
        // Get question ID
        var questionId = getQuestionId(question);
        if (!questionId) {
            console.error("Match Following: Could not determine question ID");
            return;
        }
        
        console.log("Match Following: Creating UI for question " + questionId);
        
        // Create container element
        var container = document.createElement('div');
        container.className = 'match_following_ui';
        container.innerHTML = '<p>Match Following question - UI will be added here</p>';
        
        // Add to question
        question.appendChild(container);
    }
    
    // Helper to get question ID
    function getQuestionId(question) {
        // Try to get from inputs
        var inputs = question.querySelectorAll('input[name^="question_"]');
        for (var i = 0; i < inputs.length; i++) {
            var name = inputs[i].name;
            var match = name.match(/question_(\d+)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
})();