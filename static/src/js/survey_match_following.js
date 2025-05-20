/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.o_survey_match_following_wrapper',
    events: {
        'dragstart .o_match_item': '_onDragStart',
        'dragover .o_match_questions, .o_match_answers': '_onDragOver',
        'dragleave .o_match_questions, .o_match_answers': '_onDragLeave',
        'drop .o_match_questions, .o_match_answers': '_onDrop',
        'dragend .o_match_item': '_onDragEnd'
    },

    start: function () {
        this._super.apply(this, arguments);
        this._setupDragDrop();
        this._loadStoredAnswers();
    },

    _setupDragDrop: function() {
        // Initialize drag and drop for all items
        this.$('.o_match_item').each(function() {
            $(this).attr('draggable', true);
        });
    },
    
    _loadStoredAnswers: function() {
        const storedValue = this.$('input[type="hidden"]').val();
        if (storedValue) {
            try {
                const matches = JSON.parse(storedValue);
                // Process and display stored matches
                matches.forEach(match => {
                    const pairId = match.pair_id;
                    if (pairId) {
                        // Move items to their saved positions
                        const $item = this.$(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
                        if ($item.length) {
                            $item.attr('data-matched', 'true');
                            $item.addClass('matched');
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to load stored matches", e);
            }
        }
    },

    _onDragStart: function (ev) {
        ev.originalEvent.dataTransfer.setData('text/plain', $(ev.currentTarget).data('pair-id'));
        $(ev.currentTarget).addClass('dragging');
    },

    _onDragOver: function (ev) {
        ev.preventDefault();
        ev.originalEvent.dataTransfer.dropEffect = 'move';
        $(ev.currentTarget).addClass('drop-zone-active');
    },
    
    _onDragLeave: function (ev) {
        $(ev.currentTarget).removeClass('drop-zone-active');
    },
    
    _onDragEnd: function (ev) {
        this.$('.dragging').removeClass('dragging');
        this.$('.drop-zone-active').removeClass('drop-zone-active');
    },

    _onDrop: function (ev) {
        ev.preventDefault();
        const pairId = ev.originalEvent.dataTransfer.getData('text/plain');
        const $item = this.$(`.o_match_item[data-pair-id="${pairId}"]`);
        const $target = $(ev.currentTarget);
        
        // Handle dropping in answer column (matching)
        if ($target.hasClass('o_match_answers')) {
            // Mark the question item as matched
            const $questionItem = this.$(`.o_match_questions .o_match_item[data-pair-id="${pairId}"]`);
            $questionItem.attr('data-matched', 'true');
            $questionItem.addClass('matched');
            
            // Remove existing highlight on previously matched answers
            this.$('.o_match_answers .matched-with-' + pairId).removeClass('matched-with-' + pairId);
            
            // Highlight the answer item
            const $answerItem = this.$(`.o_match_answers .o_match_item[data-pair-id="${pairId}"]`);
            $answerItem.addClass('matched');
            $answerItem.addClass('matched-with-' + pairId);
        }
        
        // Update the hidden input with matches
        this._updateMatches();
        
        $item.removeClass('dragging');
        $target.removeClass('drop-zone-active');
    },

    _updateMatches: function() {
        const matches = [];
        
        // Collect all matched pairs
        this.$('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
            const pairId = $(this).data('pair-id');
            matches.push({
                pair_id: pairId,
                matched: true
            });
        });
        
        // Update the hidden input with the JSON value
        this.$('input[type="hidden"]').val(JSON.stringify(matches));
    },

    _submitSurvey: async function(surveyToken, questionId, data) {
        await this.env.services.rpc({
            route: `/survey/submit/${surveyToken}/${questionId}`, // Use actual question ID
            params: data,
        }).then((response) => {
            // Handle the response
        }).catch((error) => {
            console.error("Error submitting survey:", error);
        });
    }
});