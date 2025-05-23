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

// Patch the SurveyFormWidget to handle match following questions properly
import { patch } from "@web/core/utils/patch";
const formWidgetsRegistry = require("@web/legacy/js/public/public_widget_registry");
const SurveyFormWidget = formWidgetsRegistry.get("survey_form");

if (SurveyFormWidget) {
    patch(SurveyFormWidget.prototype, 'custom_elearn.SurveyFormWidgetPatch', {
        _submitForm: function () {
            // Before submitting the form, make sure all match following answers are processed
            const matchFollowing = $('.o_survey_match_following_wrapper').map(function() {
                const widget = $(this).data('widget');
                if (widget && widget._updateMatches) {
                    widget._updateMatches();
                }
            });
            
            // Call the original method
            return this._super.apply(this, arguments);
        },
        
        _onNextScreenDone: function (result) {
            // Make the original method more robust
            try {
                // If there's no result or result is not iterable, provide a default
                if (!result || typeof result[Symbol.iterator] !== 'function') {
                    console.warn("Survey received invalid result format, using default");
                    result = [];
                }
                
                // Call the original method with the sanitized result
                return this._super.apply(this, arguments);
            } catch (error) {
                console.error("Error in _onNextScreenDone:", error);
                // Provide fallback behavior - go to next question if possible
                this.trigger_up('reload');
                return Promise.resolve();
            }
        }
    });
}

export default {
    SurveyMatchFollowing: publicWidget.registry.SurveyMatchFollowing
};