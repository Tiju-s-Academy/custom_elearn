/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.o_survey_match_following_wrapper',
    events: {
        'dragstart .o_match_item': '_onDragStart',
        'dragover .o_match_questions, .o_match_answers': '_onDragOver',
        'drop .o_match_questions, .o_match_answers': '_onDrop',
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
        $target.append($item.clone());
        $item.removeClass('dragging');
        $(ev.currentTarget).removeClass('drop-zone-active');

        // Update the hidden input with matches
        this._updateMatches();
    },

    _updateMatches: function() {
        const matches = [];
        this.$('.o_match_questions .o_match_item').each(function() {
            matches.push({
                pair_id: $(this).data('pair-id'),
                position: $(this).index()
            });
        });
        this.$('input[type="hidden"]').val(JSON.stringify(matches));
        
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
        const url = window.location.href;
        const match = url.match(/\/survey\/([^\/]+)/) || 
                     url.match(/\/begin\/([^\/]+)/);
                     
        return match ? match[1] : null;
    }
});

export default {
    SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
};