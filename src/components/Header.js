import React, { useContext } from 'react';
import { Auth } from 'aws-amplify';
import { UserContext } from '../Auth';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Avatar from '@material-ui/core/Avatar';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { Tooltip } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1
  },
  menuButton: {
    marginRight: theme.spacing(2)
  },
  avatar: {
    margin: 5
  },
  title: {
    flexGrow: 1
  }
}));

export default function Header() {
  const classes = useStyles();
  const user = useContext(UserContext);

  const displayName = user.attributes.name
    ? user.attributes.name
    : user.username;

  const pictureSrc = user.attributes.picture ? user.attributes.picture : '';

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          {/* <Avatar src={pictureSrc} className={classes.avatar} /> */}
          <Typography className={classes.title}>Speak in Tounges</Typography>
          <Tooltip title={displayName}>
            {user.attributes.picture ? (
              <Avatar src={pictureSrc} className={classes.avatar} />
            ) : (
              <AccountCircleIcon fontSize="large" className={classes.avatar} />
            )}
          </Tooltip>
          {/* <Typography>{displayName}</Typography> */}
          <Button onClick={async () => await Auth.signOut()} color="inherit">
            Logout
          </Button>
        </Toolbar>
      </AppBar>
    </div>
  );
}
