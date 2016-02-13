import React, {Component} from 'react';
import {connect} from 'react-redux';

export default function local({
  ident, // string / ƒ(props)
  initial = {}, // object / ƒ(props)
  reducer = x => x, // ƒ(state, action) => state
  persist = true // experimental - can swap out state on unmount
} = {}){
  if (!ident){
    throw new Error('cannot annotate with @local without an ident');
  }

  return function(Target){

    function getId(props){
      if (typeof ident === 'string'){
        return ident;
      }
      return ident(props);
    }

    function getInitial(props){
      if (typeof initial !== 'function'){
        return initial;
      }
      return initial(props);
    }

    return @connect((state, props) => ({
      local: state.local[getId(props)]
    }))
    class ReduxReactLocal extends Component{
      static displayName = 'local:' + (Target.displayName || Target.name);

      state = {
        id: getId(this.props),
        value: getInitial(this.props)
      };

      componentWillMount(){
        this.props.dispatch({
          type: 'local.register',
          payload: {
            ident: this.state.id,
            reducer,
            initial: this.state.value
          }
        });
      }

      componentWillReceiveProps(next){
        let id = getId(next);

        if (id !== this.state.id){
          this.props.dispatch({
            type: 'local.swap',
            payload: {
              ident: this.state.id,
              next: id,
              initial: getInitial(next)
            }
          });

        }
        this.setState({ id, value: next.local });
      }

      $ = action => {
        // 'localize' an event. super conveninent for actions 'local' to this component
        return  {
          ...action,
          type: `${this.state.id}:${action.type}`,
          meta: {
            ...action.meta || {},
            ident: this.state.id,
            type: action.type,
            local: true
          }
        };
      };

      _setState = state => {
        this.props.dispatch(this.$({type: 'setState', payload: state}));
      };

      render(){
        return React.createElement(Target, {
          ...this.props,
          $: this.$,
          ident: this.state.id,
          dispatch: this.props.dispatch,
          state: this.state.value,
          setState: this._setState
        }, this.props.children);
      }

      componentWillUnmount(){
        this.props.dispatch({
          type: 'local.unmount',
          payload: {
            ident: this.state.id,
            persist
          }
        });
      }
    };
  };
}
