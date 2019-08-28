import axios from "axios";
import React from "react";
import "./App.css";
import {
  MenuItem,
  Typography,
  AppBar,
  Toolbar,
  Drawer,
  InputBase,
  Select
} from "@material-ui/core";
import SearchIcon from '@material-ui/icons/Search';
import ResourceList from './ResourceList';
import _ from "lodash";
import { SquareLoader } from "react-spinners";


const RESOURCE_TYPES = ["Pod", "Node", "Deployment", "ReplicaSet", "DaemonSet", "CronJob", "HorizontalPodAutoscaler", "Job", "StatefulSet", "Service", "Endpoints", "ConfigMap", "Ingress", "Issuer"];
const drawerWidth = 240;
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      events: [],
      resource: RESOURCE_TYPES[0],
      prefix: "",
      loading: true,
      namespaces: ["kube-system"],
      currentNamespace: "kube-system"
    };
    this.changeResource = this.changeResource.bind(this);
    this.changePrefix = this.changePrefix.bind(this);
    this.queryEvents = this.queryEvents.bind(this);
    this.updateNamespace = this.updateNamespace.bind(this);
    this.debounce = _.debounce(function() {
      this.getEvents();
    }, 1000);
  }

  getEvents() {
    const config = {
      headers: {
        Authorization:
        "ApiKey " + process.env.REACT_APP_ROCKSET_API_KEY
      }
    };
    const body = {
      sql: {
        query: `SELECT e.event.involvedObject.name, e.verb, e.event.reason, e.event.message, e.event.lastTimestamp FROM commons.eventrouter_events e
                  WHERE e.event.involvedObject.kind = '${this.state.resource}'
                  AND e.event.involvedObject.name LIKE '${this.state.prefix}%'
                  AND e.event.involvedObject.namespace = '${this.state.currentNamespace}'
                  LIMIT 25
        `
      }
    };
    axios
      .post(
        "https://api.rs2.usw2.rockset.com/v1/orgs/self/queries",
        body,
        config
      )
      .then(response => {
        let data = response.data;
        this.setState({ events: data["results"], loading: false });
      })
      .catch(error => {
        console.log(error);
      });
  }

  getNameSpaces() {
    const config = {
      headers: {
        Authorization:
        "ApiKey " + process.env.REACT_APP_ROCKSET_API_KEY
      }
    };
    const body = {
      sql: {
        query: `SELECT DISTINCT e.event.involvedObject.namespace FROM commons.eventrouter_events e`
      }
    };
    axios
      .post(
        "https://api.rs2.usw2.rockset.com/v1/orgs/self/queries",
        body,
        config
      )
      .then(response => {
        let namespaces = response.data;
        this.setState({ namespaces: namespaces["results"].map(obj => obj.namespace) });
      })
      .catch(error => {
        console.log(error);
      });
  }

  queryEvents() {
    this.debounce.cancel();
    this.debounce();
  }

  updateNamespace(e) {
    this.setState({ currentNamespace: e.target.value, loading: true }, () => {
      this.queryEvents();
    });
  }

  componentDidMount() {
    this.getEvents();
    this.getNameSpaces();
  }

  changeResource(val) {
    this.setState({ resource: val, loading: true }, () => {
      this.queryEvents();
    });
  }

  changePrefix(e) {
    this.setState({ prefix: e.target.value, loading: true }, () => {
      this.queryEvents();
    });
  }

  render() {
    const {
      events,
      namespaces,
      currentNamespace
    } = this.state;
    window.events = events;
    return (
      <div>
        <div style={{"width": `${drawerWidth}`}}>
        <Drawer open={true} variant="permanent">
          <div style={{"width": `${drawerWidth}px`}}>
          <div>
          <MenuItem>
            <strong>
              Namespace
            </strong>
          </MenuItem>
          <div style={{"paddingLeft": "5%"}}>
            <Select style={{"width": "200px"}} value={currentNamespace} onChange={this.updateNamespace}>
              {namespaces.map((namespace) => (
                <MenuItem key={namespace} value={namespace}>{namespace}</MenuItem>
              ))}
            </Select>
          </div>
          <MenuItem>
            <strong>
              Resource Type
            </strong>
          </MenuItem>
          </div>
            {RESOURCE_TYPES.map(val => (
              <MenuItem key={val} onClick={() =>this.changeResource(val)}>
                {val}
              </MenuItem>
            ))}
          </div>
        </Drawer>
        </div>
        <div style={{marginLeft: `${drawerWidth}px`}}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h3"> {this.state.resource} </Typography>
              <div>
                <SearchIcon style={{paddingLeft: '200'}}/>
              </div>
              <div>
              <InputBase
              placeholder="Filter by prefix"
              style={{
                "color": "white", 
                height: '100%', 
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                width: "200px"
            }}
              inputProps={{ 'aria-label': 'search' }}
              onChange={this.changePrefix}
            />
              </div>
            </Toolbar>
          </AppBar>
        </div>
        <div style={{marginLeft: `${drawerWidth}px`}}>
          {this.state.loading ?
            <div style={{"paddingLeft" :"50%", paddingTop: "20%"}}>
              <SquareLoader size={150} color={"#3f51b5"}/>
            </div>
           : 
           <ResourceList events={this.state.events}/>
          }
        </div>
      </div>
    );
  }
}

export default App;
