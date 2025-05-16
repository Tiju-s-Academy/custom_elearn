from odoo import fields, models

class SurveyUserInputLine(models.Model):
    _inherit = 'survey.user_input.line'

    value_match_following = fields.Text(
        string='Match Following Answer',
        help="Stores the matched pairs in JSON format"
    )