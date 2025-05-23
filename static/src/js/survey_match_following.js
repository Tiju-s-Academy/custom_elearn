/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.o_survey_match_following_wrapper',
    events: {
        'dragstart .o_match_item': '_onDragStart',
        'dragover .o_match_questions, .o_match_answers': '_onDragOver',
        'drop .o_match_questions, .o_match_answers': '_onDrop',
        'dragend .o_match_item': '_onDragEnd',
    },

    start: function () {
        this._super.apply(this, arguments);
        this.$('.o_match_item').attr('draggable', true);
        this._setupDragDrop();
    },

    _setupDragDrop: function() {
        // Initialize drag and drop for all items
        this.$('.o_match_item').each(function() {
            $(this).attr('draggable', true);
        });
    },

    _onDragStart: function (ev) {
        ev.originalEvent.dataTransfer.setData('text/plain', $(ev.currentTarget).data('pair-id'));
        $(ev.currentTarget).addClass('dragging');
    },
    
    _onDragEnd: function (ev) {
        $(ev.currentTarget).removeClass('dragging');
        this.$('.drop-zone-active').removeClass('drop-zone-active');
    },

    _onDragOver: function (ev) {
        ev.preventDefault();
        ev.originalEvent.dataTransfer.dropEffect = 'move';
        $(ev.currentTarget).addClass('drop-zone-active');
    },

    _onDrop: function (ev) {
        ev.preventDefault();
        const pairId = ev.originalEvent.dataTransfer.getData('text/plain');
        const $item = this.$(`.o_match_item[data-pair-id="${pairId}"]`).first();
        const $target = $(ev.currentTarget).closest('.o_match_questions, .o_match_answers');

        // Remove existing item if it exists in target
        this.$(`.o_match_item[data-pair-id="${pairId}"]`).not($item).remove();

        // Clone and append the dragged item
        const $clone = $item.clone();
        $target.append($clone);
        
        // Mark as matched if dropped in answers area
        if ($target.hasClass('o_match_answers')) {
            $clone.addClass('matched');
            $clone.attr('data-matched', 'true');
            // Find original in questions area and mark it
            const $original = this.$('.o_match_questions .o_match_item[data-pair-id="' + pairId + '"]');
            if ($original.length) {
                $original.addClass('matched');
                $original.attr('data-matched', 'true');
            }
        }
        
        $item.removeClass('dragging');
        $(ev.currentTarget).removeClass('drop-zone-active');

        // Update the hidden input with matches
        this._updateMatches();
    },

    _updateMatches: function() {
        const matches = [];
        this.$('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
            matches.push({
                pair_id: $(this).data('pair-id'),
                matched: true
            });
        });
        
        // Update the hidden input with the matches
        const questionId = this.$el.data('question-id');
        const inputName = 'question_' + questionId;
        this.$(`input[name="${inputName}"]`).val(JSON.stringify(matches));
        
        // Submit the matches to the server
        this._submitMatches(matches);
    },
    
    _submitMatches: function(matches) {
        // Get the question ID and survey token
        const questionId = this.$el.data('question-id');
        const surveyToken = this._getSurveyToken();
        
        if (!questionId || !surveyToken) {
            console.log('Match Following: Missing question ID or survey token');
            return;
        }
        
        // Debug output
        console.log(`Submitting matches to server: questionId=${questionId}, token=${surveyToken}`, matches);
        
        // Submit to server using Odoo's RPC mechanism
        this._rpc({
            route: `/survey/submit/${surveyToken}/${questionId}`,
            params: {
                value_match_following: matches
            }
        }).then(function(result) {
            console.log('Match Following: Submission successful', result);
        }).guardedCatch(function(error) {
            console.error('Match Following: Submission failed', error);
        });
    },
    
    _getSurveyToken: function() {
        // First try to get from form action
        const $form = $('.o_survey_form');
        if ($form.length) {
            const actionUrl = $form.attr('action');
            if (actionUrl) {
                const actionMatch = actionUrl.match(/\/survey\/([^\/]+)/);
                if (actionMatch && actionMatch[1]) {
                    return actionMatch[1];
                }
            }
        }
        
        // Try from URL
        const url = window.location.href;
        const urlMatch = url.match(/\/survey\/([^\/]+)/) || 
                         url.match(/\/begin\/([^\/]+)/);
        if (urlMatch && urlMatch[1]) {
            return urlMatch[1];
        }
        
        // Try from input field
        const $tokenInput = $('input[name="token"]');
        if ($tokenInput.length) {
            return $tokenInput.val();
        }
        
        return null;
    }
});

export default {
    SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
};