from odoo import fields, models

class SurveyQuestionMatch(models.Model):
    _name = 'survey.question.match'
    _description = 'Survey Question Match'

    question_id = fields.Many2one('survey.question', string='Question')
    left_option = fields.Char(string='Left Option', required=True)
    right_option = fields.Char(string='Right Option', required=True)
    score = fields.Integer(string='Score', default=1)