from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class SurveyMatchFollowing(http.Controller):
    
    @http.route(['/survey/submit/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True, csrf=False)
    def survey_submit(self, survey_token, question_id, **post):
        try:
            # Safety check for survey
            survey_sudo = request.env['survey.survey'].sudo().search([('access_token', '=', survey_token)], limit=1)
            
            if not survey_sudo:
                return {'success': False, 'error': 'Survey not found'}
                
            # Find the question by ID
            if question_id and question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
                if not question.exists():
                    return {'success': False, 'error': 'Question not found'}
                
                if question.question_type == 'match_following':
                    value_match_following = post.get('value_match_following')
                    if value_match_following:
                        # Find user session
                        user_input = request.env['survey.user_input'].sudo().search([
                            ('survey_id', '=', survey_sudo.id),
                            ('access_token', '=', survey_token)
                        ], limit=1)
                        
                        if user_input:
                            # Create or update answer line
                            vals = {
                                'user_input_id': user_input.id,
                                'question_id': question.id,
                                'value_match_following': value_match_following,
                                'answer_type': 'match_following'
                            }
                            
                            # Check if answer already exists
                            answer_line = request.env['survey.user_input.line'].sudo().search([
                                ('user_input_id', '=', user_input.id),
                                ('question_id', '=', question.id)
                            ], limit=1)
                            
                            if answer_line:
                                answer_line.sudo().write({
                                    'value_match_following': value_match_following
                                })
                            else:
                                request.env['survey.user_input.line'].sudo().create(vals)
                                
                            # Return a format that works with survey.js expectations
                            return {
                                'success': True,
                                'question_id': question.id,
                                'results': [{
                                    'id': question.id,
                                    'value': value_match_following
                                }]
                            }
                        else:
                            return {'success': False, 'error': 'User session not found'}
                    else:
                        return {'success': False, 'error': 'No match following data provided'}
                else:
                    return {'success': False, 'error': 'Question is not a match following type'}
            else:
                return {'success': False, 'error': 'Invalid question ID format'}
                
        except Exception as e:
            _logger.exception("Error in match following submission")
            return {'success': False, 'error': str(e)}
