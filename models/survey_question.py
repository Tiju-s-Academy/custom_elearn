from odoo import api, fields, models, _


class SurveyQuestion(models.Model):
    _inherit = 'survey.question'

    question_type = fields.Selection(
        selection_add=[('match_following', 'Match Following')],
        ondelete={'match_following': 'cascade'}
    )
    shuffle_right_options = fields.Boolean('Shuffle Right Options', default=True,
        help="If checked, options on the right side will be shuffled for each survey session")
    shuffle_left_options = fields.Boolean('Shuffle Left Options', default=False,
        help="If checked, options on the left side will be shuffled for each survey session")

    match_following_pairs = fields.One2many(
        'survey.question.match.pair',
        'question_id',
        string='Match Following Pairs',
        help="Define the pairs for match following questions"
    )

    # Add default match pairs when creating a match following question
    @api.model_create_multi
    def create(self, vals_list):
        questions = super(SurveyQuestion, self).create(vals_list)
        for question in questions:
            if question.question_type == 'match_following' and not question.match_following_pairs:
                # Create some sample pairs
                self.env['survey.question.match.pair'].create([{
                    'question_id': question.id,
                    'sequence': 1,
                    'left_option': 'Apple',
                    'right_option': 'Fruit'
                }, {
                    'question_id': question.id,
                    'sequence': 2,
                    'left_option': 'Dog',
                    'right_option': 'Animal'
                }, {
                    'question_id': question.id,
                    'sequence': 3,
                    'left_option': 'Car',
                    'right_option': 'Vehicle'
                }])
        return questions


class SurveyQuestionMatchPair(models.Model):
    _name = 'survey.question.match.pair'
    _description = 'Survey Question Match Pair'
    _order = 'sequence, id'

    question_id = fields.Many2one(
        'survey.question',
        string='Question',
        required=True,
        ondelete='cascade'
    )
    sequence = fields.Integer(default=10)
    left_option = fields.Char('Left Option', required=True, translate=True)
    right_option = fields.Char('Right Option', required=True, translate=True)
    score = fields.Float('Score', default=1.0)


class SurveyUserInputLine(models.Model):
    _inherit = 'survey.user_input.line'

    # Add the match_following answer type
    answer_type = fields.Selection(selection_add=[('match_following', 'Match Following')],
                                  ondelete={'match_following': 'cascade'})
    value_match_following = fields.Text('Match Following')