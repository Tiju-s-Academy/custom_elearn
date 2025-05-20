from odoo import fields, models, api


class SurveyQuestion(models.Model):
    _inherit = 'survey.question'

    question_type = fields.Selection(
        selection_add=[('match_following', 'Match Following')],
        ondelete={'match_following': 'cascade'}
    )

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


class SurveyQuestionMatch(models.Model):
    _name = 'survey.question.match'
    _description = 'Survey Question Match Following Pairs'
    _rec_name = 'left_option'

    question_id = fields.Many2one(
        'survey.question',
        string='Question',
        required=True,
        ondelete='cascade'
    )
    left_option = fields.Char('Left Option', required=True, translate=True)
    right_option = fields.Char('Right Option', required=True, translate=True)
    score = fields.Float('Score', default=1.0)