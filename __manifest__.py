{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': [
        'web',
        'website',
        'survey',
    ],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': "Adds drag and drop question types in e-learn module",
    'data': [
        'security/ir.model.access.csv',
        'views/survey_question_inherit_view.xml',
        'views/assets.xml',
        'views/survey_templates.xml',
        # 'views/minimal_assets.xml',  # Try this first
    ],
    'assets': {
        'survey.assets_frontend': [
            'custom_elearn/static/src/css/survey_match_following.css',
            'custom_elearn/static/src/js/survey_match_following.js',
        ],
    },
    'license': 'LGPL-3',
    'application': True,
}
