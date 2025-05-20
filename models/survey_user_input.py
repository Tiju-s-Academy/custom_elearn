from odoo import fields, models, api
import json

class SurveyUserInputLine(models.Model):
    _inherit = 'survey.user_input.line'

    value_match_following = fields.Text(
        string='Match Following Answer',
        help="Stores the matched pairs in JSON format"
    )
    
    @api.depends('question_id.question_type', 'value_match_following', 'question_id.match_following_pairs')
    def _compute_answer_score(self):
        super(SurveyUserInputLine, self)._compute_answer_score()
        
        for answer in self:
            if answer.question_id.question_type == 'match_following' and answer.value_match_following:
                score = 0
                try:
                    # Parse the stored JSON
                    matches = json.loads(answer.value_match_following)
                    
                    # Compare user matches with correct pairs
                    for match in matches:
                        pair_id = match.get('pair_id')
                        if pair_id:
                            pair = self.env['survey.question.match'].browse(int(pair_id))
                            # Award score if pair exists and positions match
                            if pair and pair.question_id.id == answer.question_id.id:
                                score += pair.score
                                
                    answer.answer_score = score
                except (ValueError, json.JSONDecodeError):
                    answer.answer_score = 0