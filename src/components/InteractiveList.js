import React, { useRef, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import FolderIcon from '@material-ui/icons/Folder';
import DeleteIcon from '@material-ui/icons/Delete';

const useStyles = makeStyles(theme => ({
  listItemRoot: {
    paddingTop: 0,
    paddingBottom: 0
  },
  root: {
    flexGrow: 1,
    //maxWidth: ,
    //marginTop: 10,
    height: 'inherit',
    //height: window.innerHeight / 2,
    //backgroundColor: 'red',

    padding: 1,
    overflow: 'scroll'
  },
  demo: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper
    //borderRadius: 5,
    //borderStyle: 'solid'
    //borderColor: 'black',
    // borderWidth: 'thin'
    //maxHeight: 'inherit'
  },
  listItemTextRoot: {
    marginTop: 0,
    marginBottom: 0
  }
}));

export default function InteractiveList({ data, style }) {
  //   data = [
  //     { transcript: "hello how're you?", sentiment: 'neutral' },
  //     { transcript: 'This is pretty good', sentiment: 'positive' },
  //     {
  //       transcript: 'This has been less than ideal experience',
  //       sentiment: 'negative'
  //     },
  //     { transcript: "hello how're you?", sentiment: 'neutral' },
  //     { transcript: 'This is pretty good', sentiment: 'positive' },
  //     {
  //       transcript: 'This has been less than ideal experience',
  //       sentiment: 'negative'
  //     }
  //   ];
  const classes = useStyles();
  const ref = useRef();
  return (
    <Grid className={classes.demo} container>
      <Grid className={classes.root} item xs={12} md={12}>
        <List

        //dense={true}
        >
          {data.map(({ transcript, sentiment }, i) => (
            <ListItem
              key={i}
              classes={{
                root: classes.listItemRoot
              }}
            >
              <ListItemText
                classes={{
                  root: classes.listItemTextRoot
                }}
                primaryTypographyProps={{
                  variant: 'body1',
                  color:
                    sentiment === 'positive'
                      ? 'primary'
                      : sentiment === 'negative'
                      ? 'secondary'
                      : 'textPrimary'
                }}
                //   secondaryTypographyProps={{
                //     color:
                //       sentiment === 'positive'
                //         ? 'primary'
                //         : sentiment === 'negative'
                //         ? 'secondary'
                //         : 'textSecondary'
                //   }}
                primary={transcript}

                // primary={
                //   <React.Fragment>
                //     {/* <Typography
                //       component="span"
                //       variant="body2"
                //       className={classes.inline}
                //       color="textPrimary"
                //     >
                //       to Scott, Alex, Jennifer
                //     </Typography> */}
                //     <Typography>
                //       Wikimedia Commons is a media file repository making
                //       available public domain and freely-licensed educational
                //       media content (images, sound and video clips) to
                //       everyone, in their own language. It acts as a common
                //       repository for the various projects of the Wikimedia
                //       Foundation, but you do not need to belong to one of
                //       those projects to use media hosted here. The repository
                //       is created and maintained not by paid archivists, but by
                //       volunteers. The scope of Commons is set out on the
                //       project scope pages
                //     </Typography>
                //   </React.Fragment>
                // }
                //secondary={'.'}
              />
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  );
}
