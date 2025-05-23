/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import publicWidget from "@web/legacy/js/public/public_widget";

// Add behavior to standard survey form
publicWidget.registry.survey_form.include({
    events: Object.assign({}, publicWidget.registry.survey_form.prototype.events, {
        'submit': '_onFormSubmit',
    }),

    /**
     * Handle form submission
     */
    _onFormSubmit: function (event) {
        // Find any match following wrappers and update their matches before submission
        this.$('.o_survey_match_following_wrapper').each(function() {
            var questionId = $(this).data('question-id');
            if (questionId) {
                // Update matches
                var matches = [];
                $(this).find('.o_match_questions .o_match_item[data-matched="true"]').each(function() {
                    matches.push({
                        pair_id: $(this).data('pair-id'),
                        matched: true
                    });
                });
                
                // Update hidden input
                var inputName = 'question_' + questionId;
                $(this).find('input[name="' + inputName + '"]').val(JSON.stringify(matches));
            }
        });
    },
});
