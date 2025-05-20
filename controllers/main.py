from odoo import http
from odoo.http import request

class SurveyMatchFollowing(http.Controller):
    
    @http.route(['/survey/submit/<string:survey_token>/<string:question_id>'], 
                type='json', auth='public', website=True, csrf=False)
    def survey_submit(self, survey_token, question_id, **post):
        # Safety check for question_id
        survey_sudo = request.env['survey.survey'].sudo().search([('access_token', '=', survey_token)], limit=1)
        
        if not survey_sudo:
            return {'error': 'Survey not found'}
            
        # For match following questions, we need to handle the unique format
        # Instead of trying to parse question_id as int, find the question by some identifier
        if question_id:
            # Try to find the question either by ID or by another identifier
            question = None
            
            if question_id.isdigit():
                question = request.env['survey.question'].sudo().browse(int(question_id))
            else:
                # Check if the question ID might be another identifier like access_token
                question = request.env['survey.question'].sudo().search([
                    ('survey_id', '=', survey_sudo.id), 
                    ('access_token', '=', question_id)
                ], limit=1)
                
                # If not found by access_token, it might be a technical name or another field
                if not question:
                    # Try other potential identifiers
                    questions = request.env['survey.question'].sudo().search([
                        ('survey_id', '=', survey_sudo.id)
                    ])
                    # Add debug info
                    return {
                        'error': 'Question not found',
                        'debug': {
                            'question_id': question_id,
                            'questions': [{'id': q.id, 'title': q.title} for q in questions]
                        }
                    }
            
            if question and question.question_type == 'match_following':
                # Process the match following question data
                value_match_following = post.get('value_match_following')
                # Process and save the data
                # ...
                return {
                    'success': True,
                    'question_id': question.id
                }
        
        return {'error': 'Invalid request'}
