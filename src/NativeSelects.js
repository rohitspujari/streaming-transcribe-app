import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  formControl: {
    //margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  }
}));

export default function NativeSelects({
  options,
  disabled,
  onChange,
  label,
  value
}) {
  const classes = useStyles();
  const [state, setState] = React.useState({
    language: 'hi'
  });

  const inputLabel = React.useRef(null);
  const [labelWidth, setLabelWidth] = React.useState(0);
  React.useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth);
  }, []);

  const handleChange = name => event => {
    setState({
      ...state,
      [name]: event.target.value
    });
  };

  return (
    <div className={classes.root}>
      <FormControl variant="outlined" className={classes.formControl}>
        <InputLabel ref={inputLabel}>{label}</InputLabel>
        <Select
          disabled={disabled}
          native
          value={value}
          onChange={onChange}
          labelWidth={labelWidth}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
