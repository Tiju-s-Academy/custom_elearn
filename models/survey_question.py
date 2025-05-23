from odoo import fields, models, api


class SurveyQuestion(models.Model):
    _inherit = 'survey.question'

    question_type = fields.Selection(
        selection_add=[('match_following', 'Match Following')],
        ondelete={'match_following': 'cascade'}
    )

    # Options for match following
    shuffle_right_options = fields.Boolean('Shuffle Right Options', default=True)
    shuffle_left_options = fields.Boolean('Shuffle Left Options', default=False)

    # Field for match following pairs
    match_following_pairs = fields.One2many(
        'survey.question.match',
        'question_id',
        string='Match Following Pairs'
    )

    def _get_match_following_score(self):
        """Get total possible score for match following question"""
        self.ensure_one()
        if self.question_type != 'match_following':
            return 0
        return sum(pair.score for pair in self.match_following_pairs)

    def _prepare_result_data(self, user_input_lines, answer_count, scored_only):
        result = super(SurveyQuestion, self)._prepare_result_data(user_input_lines, answer_count, scored_only)

        if self.question_type == 'match_following':
            result['match_following_data'] = {
                'pairs': [(p.id, p.left_option, p.right_option) for p in self.match_following_pairs],
                'total_score': self._get_match_following_score()
            }

        return result