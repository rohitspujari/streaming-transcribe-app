import React, { useState, useEffect, useReducer, createContext } from 'react';
import awsconfig from './aws-exports';
import Amplify, { Auth, Hub } from 'aws-amplify';
import Header from './components/Header';

import {
  TextField,
  Grid,
  Button,
  Typography,
  Box,
  Card,
  Divider,
  CircularProgress
} from '@material-ui/core';

import { makeStyles } from '@material-ui/core/styles';
import { useTheme } from '@material-ui/core/styles';

//console.log(window.location.origin);

Amplify.configure(awsconfig);
Auth.configure({
  auth0: {
    redirectUri: window.location.origin, // 'your call back url',
    returnTo: window.location.origin // 'your sign out url'
  }
});

//const ENV = JSON.parse(localEnvInfo).envName;
console.log(Auth);

const UserContext = createContext('null');

const useStyles = makeStyles(theme => ({
  root: {},
  label: {
    textTransform: 'capitalize'
  },
  buttonRoot: {
    background: 'none!important',
    border: 'none',
    padding: '0!important',
    // /*optional*/
    // font-family: arial, sans-serif;
    // /*input has OS specific font-family*/
    // color: #069;
    //textDecoration: 'underline',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline'
    }
  },
  buttonLabel: {
    textTransform: 'capitalize',
    color: theme.palette.primary.main
  }
}));

function AuthUI() {
  const theme = useTheme();
  const [formType, setFormType] = useState('SignIn');
  const [signUpUser, setSignUpUser] = useState();
  const [newPasswordUser, setNewPasswordUser] = useState();
  const [error, setError] = useState();

  const handleFormChange = name => e => {
    setError(null);
    setFormType(name);
  };

  const handleSignIn = async (username, password) => {
    try {
      await Auth.signIn(username, password); //console.log(user);
      //setFormType('Loading');
    } catch (err) {
      console.log(err);
      setError(err.message);
    }
  };

  const handleResetPassword = async username => {
    try {
      await Auth.forgotPassword(username);
      setError(null);
      setNewPasswordUser(username);
      setFormType('SetNewPassword');
    } catch (err) {
      console.log(err);
      setError(err.message);
    }
  };

  const handleSetNewPassword = async (username, code, new_password) => {
    try {
      await Auth.forgotPasswordSubmit(username, code, new_password);
      setError(null);
      setFormType('SignIn');
    } catch (err) {
      console.log(err);
      setError(err.message);
    }
  };

  const handleSignUp = async (username, password, email, phone_number) => {
    try {
      await Auth.signUp({
        username,
        password,
        attributes: {
          email, // optional
          phone_number // optional - E.164 number convention
        }
      }); //console.log(data);
      setError(null);
      setSignUpUser(username);
      setFormType('ConfirmSignUp');
    } catch (err) {
      console.log(err);
      setError(err.message);
    }
  };

  const handleConfirmSignUp = async (username, code) => {
    try {
      await Auth.confirmSignUp(username, code); // console.log(data);
      setError(null);
      setFormType('SignIn');
    } catch (err) {
      console.log(err);
      setError(err.message);
    }
  };

  const errorPrompt = () => {
    return (
      <Box
        //visibility="hidden"
        style={{
          backgroundColor: theme.palette.secondary.main,
          padding: 10,
          marginTop: 10
        }}
      >
        <Typography style={{ color: 'white' }}>{'Error: ' + error}</Typography>
      </Box>
    );
  };
  const renderForm = () => {
    switch (formType) {
      case 'SignIn':
        return <SignIn formChange={handleFormChange} signIn={handleSignIn} />;
      case 'SignUp':
        return <SignUp formChange={handleFormChange} signUp={handleSignUp} />;
      case 'ConfirmSignUp':
        return (
          <ConfirmSignUp
            username={signUpUser}
            formChange={handleFormChange}
            confirmSignUp={handleConfirmSignUp}
          />
        );
      case 'ResetPassword':
        return (
          <ResetPassword
            formChange={handleFormChange}
            resetPassword={handleResetPassword}
          />
        );
      case 'SetNewPassword':
        return (
          <SetNewPassword
            username={newPasswordUser}
            formChange={handleFormChange}
            setNewPassword={handleSetNewPassword}
          />
        );
    }
  };

  return (
    <Grid container justify="center">
      <Grid item item sm={5} xs={12}>
        <Card style={{ margin: 8, padding: 30, marginTop: 50 }}>
          {renderForm()}
          {error && errorPrompt()}
        </Card>
      </Grid>
    </Grid>
  );
}

function SignIn({ formChange, signIn }) {
  const [values, setValues] = useState({});
  const handleChange = name => e => {
    setValues({ ...values, [name]: e.target.value });
  };
  //const classes = useStyles();

  const { username, password } = values;
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Sign into your account
      </Typography>
      <TextField
        InputProps={{ inputProps: { tabIndex: 1 } }}
        id="outlined-full-width"
        onChange={handleChange('username')}
        required
        fullWidth
        label="Username"
        placeholder="Enter your username"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />

      <TextField
        id="outlined-full-width"
        InputProps={{ inputProps: { tabIndex: 2 } }}
        onChange={handleChange('password')}
        type="password"
        required
        fullWidth
        label="Password"
        placeholder="Enter your password"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <LinkButton
        variant="caption"
        label={'Forgot Password?'}
        linkLabel={'Reset Password'}
        formChange={formChange('ResetPassword')}
      />

      <Grid style={{ marginTop: 30 }} container alignItems="center">
        <Grid item xs={7}>
          <LinkButton
            formChange={formChange('SignUp')}
            label={'No Account?'}
            linkLabel={'Create Account'}
          />
        </Grid>
        <Grid item xs={5}>
          <Button
            //InputProps={{ inputProps: { tabIndex: 3 } }}
            tabIndex="3"
            onClick={() => signIn(username, password)}
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Sign In
          </Button>
        </Grid>
      </Grid>
      <Divider style={{ marginTop: 20 }} />
      <NonCapsButton
        onClick={() => Auth.federatedSignIn({ provider: 'Google' })}
      >
        Sign In with Google
      </NonCapsButton>
      <NonCapsButton
        onClick={() => Auth.federatedSignIn({ provider: 'Facebook' })}
      >
        Sign In with Facebook
      </NonCapsButton>
      <NonCapsButton onClick={() => Auth.federatedSignIn()}>
        Sign In Hosted UI
      </NonCapsButton>
      {/* <Button
        style={{ marginTop: 20 }}
        variant="outlined"
        color="primary"
        size="large"
        fullWidth
        classes={{
          label: classes.label
        }}
      >
        Sign In with Facebook
      </Button> */}
    </>
  );
}

function ResetPassword({ formChange, resetPassword }) {
  const [values, setValues] = useState({});
  const handleChange = name => e => {
    setValues({ ...values, [name]: e.target.value });
  };
  const { username } = values;
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Reset your password
      </Typography>
      <TextField
        id="outlined-full-width"
        onChange={handleChange('username')}
        required
        fullWidth
        label="Username"
        placeholder="Enter your username"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <Grid style={{ marginTop: 30 }} container alignItems="center">
        <Grid item xs={7}>
          <LinkButton
            formChange={formChange('SignIn')}
            linkLabel={'Back to Sign In'}
          />
        </Grid>
        <Grid item xs={5}>
          <Button
            onClick={() => resetPassword(username)}
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Send Code
          </Button>
        </Grid>
      </Grid>
    </>
  );
}

function SetNewPassword({ formChange, setNewPassword, username }) {
  const [values, setValues] = useState({});
  const handleChange = name => e => {
    setValues({ ...values, [name]: e.target.value });
  };

  const { code, newPassword } = values;

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Set new password
      </Typography>
      <TextField
        id="outlined-full-width"
        type="password"
        onChange={handleChange('code')}
        required
        fullWidth
        label="code"
        placeholder="Enter your code"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <TextField
        id="outlined-full-width"
        type="password"
        onChange={handleChange('newPassword')}
        required
        fullWidth
        label="New Password"
        placeholder="Enter your new password"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <Grid style={{ marginTop: 30 }} container alignItems="center">
        <Grid item xs={7}>
          <LinkButton
            formChange={formChange('SignIn')}
            //label={'Back to'}
            linkLabel={'Back to Sign In'}
          />
        </Grid>
        <Grid item xs={5}>
          <Button
            onClick={() => setNewPassword(username, code, newPassword)}
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Submit
          </Button>
        </Grid>
      </Grid>
    </>
  );
}

function SignUp({ formChange, signUp }) {
  const [values, setValues] = useState({});
  const handleChange = name => e => {
    setValues({ ...values, [name]: e.target.value });
  };

  const { username, password, email, countryCode, phone } = values;
  //const classes = useStyles();
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Create a new account
      </Typography>
      <TextField
        id="outlined-full-width"
        onChange={handleChange('username')}
        required
        fullWidth
        label="Username"
        placeholder="Enter your username"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <TextField
        id="outlined-full-width"
        onChange={handleChange('password')}
        type="password"
        required
        fullWidth
        label="Password"
        placeholder="Enter your password"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <TextField
        id="outlined-full-width"
        onChange={handleChange('email')}
        required
        fullWidth
        label="Email"
        placeholder="Enter your email"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <Grid container>
        <Grid item xs={3}>
          <TextField
            id="outlined-full-width"
            onChange={handleChange('countryCode')}
            required
            label="Code"
            placeholder="+1"
            margin="normal"
            variant="outlined"
            InputLabelProps={{
              shrink: true
            }}
          />
        </Grid>
        <Grid item xs={9}>
          <TextField
            id="outlined-full-width"
            onChange={handleChange('phone')}
            required
            fullWidth
            label="Phone Number"
            placeholder="Enter your phone number"
            margin="normal"
            variant="outlined"
            InputLabelProps={{
              shrink: true
            }}
          />
        </Grid>
      </Grid>

      <Grid style={{ marginTop: 30 }} container alignItems="center">
        <Grid item xs={7}>
          <LinkButton
            formChange={formChange('SignIn')}
            label={'Have an account?'}
            linkLabel={'Sign In'}
          />
        </Grid>
        <Grid item xs={5}>
          <Button
            onClick={() =>
              signUp(username, password, email, `${countryCode}${phone}`)
            }
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Create
          </Button>
        </Grid>
      </Grid>
    </>
  );
}

function ConfirmSignUp({ formChange, confirmSignUp, username }) {
  const [values, setValues] = useState({});
  const handleChange = name => e => {
    setValues({ ...values, [name]: e.target.value });
  };
  //const classes = useStyles();

  const resendCode = async () => {
    try {
      await Auth.resendSignUp(username); //console.log('code resent successfully');
    } catch (err) {
      console.log(err);
    }
  };

  const { confirmationCode } = values;
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Confirm Sign Up
      </Typography>
      <TextField
        id="outlined-full-width"
        disabled
        defaultValue={username}
        //onChange={handleChange('username')}
        required
        fullWidth
        label="Username"
        placeholder="Enter your username"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />

      <TextField
        id="outlined-full-width"
        onChange={handleChange('confirmationCode')}
        type="password"
        required
        fullWidth
        label="Confirmation Code"
        placeholder="Enter your code"
        margin="normal"
        variant="outlined"
        InputLabelProps={{
          shrink: true
        }}
      />
      <LinkButton
        variant="caption"
        label={'Lost your code?'}
        linkLabel={'Resend Code'}
        formChange={resendCode}
      />

      <Grid style={{ marginTop: 30 }} container alignItems="center">
        <Grid item xs={7}>
          <LinkButton
            formChange={formChange('SignIn')}
            label={''}
            linkLabel={'Back to Sign In'}
          />
        </Grid>
        <Grid item xs={5}>
          <Button
            onClick={() => confirmSignUp(username, confirmationCode)}
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Confirm
          </Button>
        </Grid>
      </Grid>

      {/* <Button
        style={{ marginTop: 20 }}
        variant="outlined"
        color="primary"
        size="large"
        fullWidth
        classes={{
          label: classes.label
        }}
      >
        Sign In with Facebook
      </Button> */}
    </>
  );
}

const Loading = () => {
  return (
    <Grid container justify="center">
      <CircularProgress
        style={{
          marginTop: window.innerHeight / 2
        }}
        disableShrink
      />
    </Grid>
  );
};

const NonCapsButton = ({ children, onClick }) => {
  //const theme = useTheme();
  const classes = useStyles();
  return (
    <Button
      onClick={onClick}
      style={{ marginTop: 20 }}
      variant="outlined"
      color="primary"
      size="large"
      fullWidth
      classes={{
        label: classes.label
      }}
    >
      {children}
    </Button>
  );
};

const LinkButton = props => {
  const theme = useTheme(); //console.log(theme);
  const classes = useStyles();

  const { label, linkLabel, formChange, variant } = props;

  return (
    <Grid container>
      <Typography variant={variant}>{label}</Typography>
      <Button
        onClick={formChange}
        disableRipple={true}
        classes={{ root: classes.buttonRoot, label: classes.buttonLabel }}
      >
        <Typography style={{ marginLeft: 5 }} variant={variant}>
          {linkLabel}
        </Typography>
      </Button>
    </Grid>
  );
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'signIn':
      return { ...state, appState: 'authenticated', user: action.payload };
    case 'signOut':
      return { ...state, appState: 'unauthenticated', user: undefined };
  }
};

const useAuth = () => {
  const [{ appState, user }, dispatch] = useReducer(reducer, {
    appState: 'unauthenticated'
  });

  const getAuthenticatedUser = async () => {
    //console.log('I am loading the component');
    try {
      const authedUser = await Auth.currentAuthenticatedUser({
        bypassCache: false // Optional, By default is false. If set to true, this call will send a request to Cognito to get the latest user data
      }); //console.log(Auth.user);
      dispatch({ type: 'signIn', payload: authedUser });
    } catch (err) {
      //console.log(err);
    }
  };

  useEffect(() => {
    Hub.listen(
      'auth',
      ({ payload }) => {
        //debugger; console.log(payload);
        switch (payload.event) {
          case 'oAuthSignOut':
            //dispatch({ type: 'signOut' });
            break;
          case 'signOut':
            if (payload.data.attributes.identities) {
              //This is necessary check, if removed the Auth UI will refresh twice. Once due to signOut state change, and other due to browser refresh as a result of logging out from oauth provider (facebook)
              return;
            }
            dispatch({ type: 'signOut' });

            break;
          case 'signIn': //console.log(Auth.user);
            getAuthenticatedUser();
            //dispatch({ type: 'signIn', payload: Auth.user });
            break;
        }
      },
      []
    );

    getAuthenticatedUser();
  }, []);

  return { appState, user };
};

const withAuth = Component => props => {
  const { appState, user } = useAuth(); //console.log(window); console.log(appState, user);
  switch (appState) {
    case 'authenticated':
      return (
        <>
          <UserContext.Provider value={user}>
            <Header />
            <Component {...props} />
          </UserContext.Provider>
        </>
      );
    case 'unauthenticated':
      return <AuthUI />;
    default:
      return <Loading />;
  }
};

export { AuthUI, useAuth, withAuth, UserContext };
