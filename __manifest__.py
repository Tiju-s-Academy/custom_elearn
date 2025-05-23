{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': ['survey'],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': """
        Adds match following question type to surveys.
        Allows creating drag and drop matching questions.
    """,
    'data': [
        'security/ir.model.access.csv',
        'views/survey_question_inherit_view.xml',
        'views/survey_question_templates.xml',
        'views/survey_match_templates.xml',
    ],
    'assets': {
        'survey.survey_assets': [
            '/custom_elearn/static/src/js/survey_match_following.js',
        ],
        'web.assets_common': [
            '/custom_elearn/static/src/css/survey_match_following.css',
        ],
    },
    'license': 'LGPL-3',
    'application': True,
    'installable': True,
}
