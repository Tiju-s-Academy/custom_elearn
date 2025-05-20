{
    'name': 'Survey Match Following',
    'version': '17.0.1.0.0',
    'depends': [
        'base',
        'web',
        'survey',
    ],
    'author': 'Tijus Academy',
    'category': 'Academic',
    'summary': 'Add new e-learn quiz type',
    'description': "Adds drag and drop question types in e-learn module",
    'data': [
        # Use the dedicated survey match assets
        'views/survey_match_assets.xml',
        'views/direct_inject.xml',
        'views/fallback_assets.xml',
        'views/assets.xml',
        'views/survey_assets.xml',
        'views/survey_templates.xml',
        'views/test_templates.xml',
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
