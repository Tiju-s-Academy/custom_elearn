from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class SurveyMatchFollowing(http.Controller):
    
    @http.route(['/survey/submit/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True, csrf=False)
    def survey_submit(self, survey_token, question_id, **post):
        # Safety check for survey
        survey_sudo = request.env['survey.survey'].sudo().search([('access_token', '=', survey_token)], limit=1)
        
        if not survey_sudo:
            return {'error': 'Survey not found'}
            
        # For match following questions, use different ways to find the question
        if question_id:
            question = None
            
            # Try to find question by ID if it's a number
            if question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
                if not question.exists():
                    question = None
            
            # If not found by ID or ID is not a number, try other methods
            if not question:
                # Try to find by title or by matching the ID to different fields
                # In Odoo 17, questions likely have question_id field or similar instead of access_token
                try:
                    # Log for debugging
                    _logger.info(f"Searching for question with ID: {question_id}")
                    
                    # Try searching by different fields
                    questions = request.env['survey.question'].sudo().search([
                        ('survey_id', '=', survey_sudo.id)
                    ])
                    
                    # Log available fields and values for debugging
                    if questions:
                        sample_question = questions[0]
                        _logger.info(f"Available fields: {sample_question._fields.keys()}")
                        _logger.info(f"Question details: {sample_question.read()[0]}")
                    
                    # Since we can't search by access_token, let's try to match by question ID or title
                    for q in questions:
                        # Check if any field or the ID matches our question_id
                        if (str(q.id) == question_id or 
                            (hasattr(q, 'question_id') and q.question_id == question_id) or
                            (hasattr(q, 'title') and q.title == question_id)):
                            question = q
                            break
                except Exception as e:
                    _logger.error(f"Error searching for question: {str(e)}")
                    return {'error': f'Error processing question: {str(e)}'}
            
            if question and question.question_type == 'match_following':
                try:
                    # Process the match following question submission
                    value_match_following = post.get('value_match_following')
                    if value_match_following:
                        # Create the user input line
                        user_input = request.env['survey.user_input'].sudo().search([
                            ('survey_id', '=', survey_sudo.id),
                            ('access_token', '=', survey_token)
                        ], limit=1)
                        
                        if user_input:
                            # Create or update answer
                            user_input_line = request.env['survey.user_input.line'].sudo().search([
                                ('user_input_id', '=', user_input.id),
                                ('question_id', '=', question.id)
                            ], limit=1)
                            
                            if user_input_line:
                                user_input_line.write({'value_match_following': value_match_following})
                            else:
                                request.env['survey.user_input.line'].sudo().create({
                                    'user_input_id': user_input.id,
                                    'question_id': question.id,
                                    'value_match_following': value_match_following
                                })
                            
                            return {'success': True, 'question_id': question.id}
                    
                    return {'error': 'No match following data provided'}
                except Exception as e:
                    _logger.error(f"Error saving match following data: {str(e)}")
                    return {'error': f'Error saving data: {str(e)}'}
        
        return {'error': 'Invalid request'}
