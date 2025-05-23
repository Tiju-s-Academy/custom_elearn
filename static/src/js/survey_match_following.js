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
    }
});

// Remove the patching code that's causing issues
// The patch functionality would need Odoo 17-specific implementation

export default {
    SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
};