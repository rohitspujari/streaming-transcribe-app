// WARNING: DO NOT EDIT. This file is automatically generated by AWS Amplify. It will be overwritten.

const awsmobile = {
    "aws_project_region": "us-east-1",
<<<<<<< HEAD
    "aws_cognito_identity_pool_id": "us-east-1:9064a4ae-f265-421b-a97a-2183cf6d5a4f",
    "aws_cognito_region": "us-east-1",
    "aws_user_pools_id": "us-east-1_5UjfXmP6j",
    "aws_user_pools_web_client_id": "3qv6s6ij0i5kk1bftlo0a029d8",
=======
    "aws_cognito_identity_pool_id": "us-east-1:03338e91-4d93-45c1-9503-f76371beb921",
    "aws_cognito_region": "us-east-1",
    "aws_user_pools_id": "us-east-1_cua6e654c",
    "aws_user_pools_web_client_id": "7tmrtkd494c2auissu51e6djj",
>>>>>>> dev
    "oauth": {
        "domain": "streamingtranscribea5a6160bf-5a6160bf-master.auth.us-east-1.amazoncognito.com",
        "scope": [
            "phone",
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin"
        ],
        "redirectSignIn": "http://localhost:3000/",
        "redirectSignOut": "http://localhost:3000/",
        "responseType": "code"
    },
    "federationTarget": "COGNITO_USER_POOLS",
    "predictions": {
        "convert": {
            "translateText": {
                "region": "us-east-1",
                "proxy": false,
                "defaults": {
                    "sourceLanguage": "en",
                    "targetLanguage": "hi"
                }
            },
            "speechGenerator": {
                "region": "us-east-1",
                "proxy": false,
                "defaults": {
                    "VoiceId": "Aditi",
                    "LanguageCode": "en-IN"
                }
            }
        }
    }
};


export default awsmobile;
