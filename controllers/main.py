from odoo import http
from odoo.addons.survey.controllers.main import Survey
import json

class SurveyExtended(Survey):
    
    @http.route('/survey/submit/<string:survey_token>/<string:answer_token>', type='http', methods=['POST'], auth='public', website=True)
    def survey_submit(self, survey_token, answer_token, **post):
        # Process match_following questions before normal submission
        for key, value in post.items():
            if key.startswith('question_'):
                question_id = key.split('_')[1]
                question = http.request.env['survey.question'].browse(int(question_id))
                
                if question.question_type == 'match_following' and value:
                    user_input = http.request.env['survey.user_input'].search([
                        ('access_token', '=', answer_token)
                    ], limit=1)
                    
                    if user_input:
                        # Save match_following answers
                        http.request.env['survey.user_input.line'].create({
                            'user_input_id': user_input.id,
                            'question_id': question.id,
                            'answer_type': 'match_following',
                            'value_match_following': value,
                        })
                    
                    # Remove this question from post to avoid double processing
                    post.pop(key)
        
        # Continue with standard submission
        return super(SurveyExtended, self).survey_submit(survey_token, answer_token, **post)
