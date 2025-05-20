/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";
import { registry } from "@web/core/registry";
import { Component } from "@odoo/owl";

publicWidget.registry.SurveyMatchFollowing = publicWidget.Widget.extend({
    selector: '.match_following_container',
    events: {
        'dragstart .o_match_item': '_onDragStart',
        'dragover .o_match_questions, .o_match_answers': '_onDragOver',
        'dragleave .o_match_questions, .o_match_answers': '_onDragLeave',
        'drop .o_match_questions, .o_match_answers': '_onDrop',
        'dragend .o_match_item': '_onDragEnd'
    },

    start: function () {
        var def = this._super.apply(this, arguments);
        // Initialize the match following functionality
        console.log("Survey Match Following initialized");
        this._setupDragDrop();
        this._loadStoredAnswers();
        return def;
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

    // For Odoo 17, include the CSRF token in your RPC call
    // If using the new Component system:
    async submitMatchFollowing(surveyToken, questionId, data) {
        // Include csrf_token in the params if needed
        await this.env.services.rpc({
            route: `/survey/submit/${surveyToken}/${questionId}`,
            params: {
                ...data,
                csrf_token: odoo.csrf_token, // Include the CSRF token
            },
        });
    },

    // Or if using older jQuery-style ajax:
    submitMatchFollowing: function(surveyToken, questionId, data) {
        return this._rpc({
            route: `/survey/submit/${surveyToken}/${questionId}`,
            params: {
                ...data,
                csrf_token: odoo.csrf_token, // Include the CSRF token
            },
        });
    },
});

odoo.define('custom_elearn.match_following', function (require) {
    'use strict';

    var core = require('web.core');
    var publicWidget = require('web.public.widget');
    var SurveyFormWidget = require('survey.form');
    var _t = core._t;

    // Extend the SurveyFormWidget
    SurveyFormWidget.include({
        events: _.extend({}, SurveyFormWidget.prototype.events, {
            'matchfollowing:submit': '_onMatchFollowingSubmit'
        }),

        /**
         * Initialize match following question handling
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                // Initialize match following functionality
                self._initMatchFollowing();
            });
        },

        /**
         * Set up match following questions
         */
        _initMatchFollowing: function () {
            var self = this;
            // Add your initialization code here
            $('.o_survey_form .match_following_container').each(function () {
                // Initialize each match following question
                console.log("Found match following question");
            });
        },

        /**
         * Handle submission of match following answers
         * 
         * @private
         * @param {Event} event
         */
        _onMatchFollowingSubmit: function (event) {
            var self = this;
            var $target = $(event.currentTarget);
            var $question = $target.closest('.js_question-wrapper');
            var questionId = $question.data('questionId');
            
            // Get match following data
            var matchData = {
                // Collect match following answers
                value_match_following: JSON.stringify([
                    // Example format - replace with actual data collection
                    {pair_id: 1, matched: true}
                ])
            };
            
            // Submit the answer to the server
            return this._submitMatchFollowingAnswer(questionId, matchData).then(function (result) {
                // Ensure result is in expected format to avoid "not iterable" error
                if (result && result.success) {
                    // Handle successful submission
                    return [{
                        id: questionId,
                        value: matchData.value_match_following
                    }];
                } else {
                    // Handle error case
                    console.error("Error submitting match following answer:", result);
                    // Return empty array to satisfy the iterable requirement
                    return [];
                }
            }).guardedCatch(function (error) {
                console.error("Failed to submit match following answer:", error);
                // Return empty array to satisfy the iterable requirement
                return [];
            });
        },

        /**
         * Submit match following answer to server
         * 
         * @private
         * @param {string} questionId
         * @param {Object} data
         * @returns {Promise}
         */
        _submitMatchFollowingAnswer: function (questionId, data) {
            var self = this;
            return this._rpc({
                route: '/survey/submit/' + this.surveyToken + '/' + questionId,
                params: data
            }).then(function (result) {
                // Ensure we return an object with the expected format
                return result || { success: false, error: "No response" };
            }).guardedCatch(function (error) {
                return { success: false, error: error };
            });
        }
    });

    return {
        // Export any functions needed
    };
});