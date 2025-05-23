/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.js_question-wrapper',
    events: {
        'dragstart .match-item': '_onDragStart',
        'dragend .match-item': '_onDragEnd',
        'dragover .left-items, .right-items': '_onDragOver',
        'dragleave .left-items, .right-items': '_onDragLeave',
        'drop .right-items .match-item': '_onDrop'
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

    /**
     * Initialize match following for this question
     */
    _initMatchFollowing: function () {
        if (this.$el.find('.match_following_container').length === 0) {
            this._createMatchFollowingUI();
        }
        return Promise.resolve();
    },

    /**
     * Create the match following UI
     */
    _createMatchFollowingUI: function () {
        // Get question ID
        var questionId = this._getQuestionId();
        if (!questionId) {
            console.error("Match Following: Could not determine question ID");
            return;
        }

        // Create container
        var $container = $('<div>', {
            'class': 'match_following_container mt-3',
            'data-question-id': questionId
        });

        // Create structure
        $container.html(`
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
                Drag items from left to match with items on right.
            </div>
            <input type="hidden" name="question_${questionId}" value="[]">
        `);

        // Add to DOM
        this.$el.append($container);

        // Add sample items
        this._addSampleItems($container);

        // Make items draggable
        $container.find('.left-items .match-item').attr('draggable', true);
    },

    /**
     * Add sample match items
     */
    _addSampleItems: function ($container) {
        var questionId = $container.data('question-id');
        
        var pairs = [
            { id: 'pair1_' + questionId, left: 'Apple', right: 'Fruit' },
            { id: 'pair2_' + questionId, left: 'Dog', right: 'Animal' },
            { id: 'pair3_' + questionId, left: 'Car', right: 'Vehicle' }
        ];

        var $leftContainer = $container.find('.left-items');
        var $rightContainer = $container.find('.right-items');

        // Add left items
        pairs.forEach(function (pair) {
            var $item = $('<div>', {
                'class': 'match-item mb-2 p-2 border rounded bg-white',
                'draggable': true,
                'data-pair-id': pair.id,
                'text': pair.left
            });
            $leftContainer.append($item);
        });

        // Add right items (shuffled)
        this._shuffleArray(pairs).forEach(function (pair) {
            var $item = $('<div>', {
                'class': 'match-item mb-2 p-2 border rounded bg-white',
                'data-pair-id': pair.id,
                'text': pair.right
            });
            $rightContainer.append($item);
        });
    },

    /**
     * Get question ID
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
     * Save matches to server
     */
    _saveMatches: function () {
        var $container = this.$el.find('.match_following_container');
        var questionId = $container.data('question-id');
        var surveyToken = this._getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.error('Match Following: Missing question ID or survey token');
            return;
        }

        // Collect matched items
        var matches = [];
        $container.find('.left-items .match-item[data-matched="true"]').each(function () {
            matches.push({
                pair_id: $(this).data('pair-id'),
                matched: true
            });
        });

        // Update hidden input
        $container.find('input[name="question_' + questionId + '"]').val(JSON.stringify(matches));

        // Submit matches
        this._ajaxSubmit(surveyToken, questionId, matches);

        // Update UI
        var totalItems = $container.find('.left-items .match-item').length;
        if (matches.length === totalItems) {
            // All matched
            if (!$container.find('.match-status').length) {
                $container.append($('<div>', {
                    'class': 'match-status alert alert-success mt-3',
                    'text': 'All items matched correctly!'
                }));
            }
        }
    },

    /**
     * Submit matches to server
     */
    _ajaxSubmit: function (surveyToken, questionId, matches) {
        console.log('Match Following: Submitting matches to server');

        this._rpc({
            route: '/survey/submit/' + surveyToken + '/' + questionId,
            params: {
                value_match_following: matches
            }
        }).then(function (result) {
            console.log('Match Following: Submission successful', result);
        }).guardedCatch(function (error) {
            console.error('Match Following: Submission failed', error);
        });
    },

    /**
     * Get survey token from URL
     */
    _getSurveyToken: function () {
        var url = window.location.href;
        var match = url.match(/\/survey\/([^\/]+)/) || 
                    url.match(/\/begin\/([^\/]+)/);
                    
        return match ? match[1] : null;
    },

    /**
     * Shuffle array
     */
    _shuffleArray: function (array) {
        var result = array.slice();
        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Handle drag start
     */
    _onDragStart: function (ev) {
        ev.originalEvent.dataTransfer.setData('text/plain', $(ev.currentTarget).data('pair-id'));
        $(ev.currentTarget).addClass('dragging');
        $(ev.currentTarget).css('opacity', '0.5');
    },

    /**
     * Handle drag end
     */
    _onDragEnd: function (ev) {
        $(ev.currentTarget).removeClass('dragging');
        $(ev.currentTarget).css('opacity', '');
        this.$('.drop-active').removeClass('drop-active');
    },

    /**
     * Handle drag over
     */
    _onDragOver: function (ev) {
        ev.preventDefault();
        $(ev.currentTarget).addClass('drop-active');
    },

    /**
     * Handle drag leave
     */
    _onDragLeave: function (ev) {
        $(ev.currentTarget).removeClass('drop-active');
    },

    /**
     * Handle drop
     */
    _onDrop: function (ev) {
        ev.preventDefault();
        $(ev.currentTarget).removeClass('drop-active');
        
        var pairId = ev.originalEvent.dataTransfer.getData('text/plain');
        if (!pairId) return;
        
        // Check if correct match
        if ($(ev.currentTarget).data('pair-id') === pairId) {
            // Correct match
            $(ev.currentTarget).addClass('matched');
            $(ev.currentTarget).css({
                'background-color': '#d4edda',
                'border-color': '#c3e6cb'
            });
            
            // Find and mark left item
            this.$('.left-items .match-item[data-pair-id="' + pairId + '"]')
                .addClass('matched')
                .attr('data-matched', 'true')
                .css({
                    'background-color': '#d4edda',
                    'border-color': '#c3e6cb'
                });
            
            // Save matches
            this._saveMatches();
        } else {
            // Wrong match
            var $target = $(ev.currentTarget);
            $target.css({
                'background-color': '#f8d7da',
                'border-color': '#f5c6cb'
            });
            
            // Reset after a moment
            setTimeout(function() {
                $target.css({
                    'background-color': '',
                    'border-color': ''
                });
            }, 1000);
        }
    }
});

// Add CSS styles
document.addEventListener('DOMContentLoaded', function() {
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
});

export default {
    SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
};