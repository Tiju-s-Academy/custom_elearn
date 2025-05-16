from odoo import fields, models


class SurveyQuestion(models.Model):
    _inherit = 'survey.question'

    question_type = fields.Selection(
        selection_add=[('match_following', 'Match the Following')],
    )

    match_following_pairs = fields.One2many(
        'survey.question.match', 'question_id',
        string='Matching Pairs'
    )