import React from 'react';
import PropTypes from 'prop-types';
import uniqueId from 'lodash/uniqueId';
import classNames from 'classnames';
import { DefaultAccordionHeader } from './headers';
import css from './Accordion.css';
import { HotKeys } from '../HotKeys';

const propTypes = {
  open: PropTypes.bool,
  id: PropTypes.string,
  contentId: PropTypes.string,
  label: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired, // eslint-disable-line react/no-unused-prop-types
  displayWhenOpen: PropTypes.element, // eslint-disable-line react/no-unused-prop-types
  displayWhenClosed: PropTypes.element, // eslint-disable-line react/no-unused-prop-types
  onToggle: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
  header: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.func]),
  contentRef: PropTypes.func,
  separator: PropTypes.bool,
  toggleKeyHandlers: PropTypes.object,
  toggleKeyMap: PropTypes.object,
  children: PropTypes.oneOfType([
    PropTypes.node,
  ]).isRequired,
};

class Accordion extends React.Component {
  static defaultProps = {
    header: DefaultAccordionHeader,
    separator: true,
  }

  constructor(props) {
    super(props);

    this.uncontrolledToggle = this.uncontrolledToggle.bind(this);
    this.initializeAccordion = this.initializeAccordion.bind(this);
    this.setContentRef = this.setContentRef.bind(this);
    this.tearDownHandlers = this.tearDownHandlers.bind(this);
    this.syncMaxHeight = this.syncMaxHeight.bind(this);
    this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
    this.collapseRaf = this.collapseRaf.bind(this);

    // ref to content div.
    this.content = null;
    // ref to toggle.
    this.toggle = null;

    // tracked scrollHeight of content div
    this.contentHeight = 0;
    // whether this.contentHeight should be updated (false indicates difference.)
    this.syncedHeight = true;

    // animation callback for expansion requestAnimationFrame (RAF)
    this.expandRAFCallback = null;
    // animation callback for collapsing requestAnimationFrame (RAF)
    this.collapseRAFCallback = null;

    // callback for syncing
    this.syncHeightCallback = null;

    // status indicators for transition - true = mid transition.
    this.transitioningOpen = false;
    this.transitioningClosed = false;

    // id for content div needed for proper area support - either supplied or auto-generated.
    this.contentId = this.initializeContentId();

    // local state may or may not be set up if open prop is passed.
    this.state = this.initializeAccordion();
  }

  componentDidMount() {
    this.syncMaxHeight();
  }

  componentWillUpdate(nextProps, nextState) {
    // prop/state changes to open status set off the animation callbacks.
    let shouldAdjust = false;
    // if using state...
    if (typeof nextState.isOpen === 'boolean') {
      if (nextState.isOpen !== this.state.isOpen) {
        if (nextState.isOpen) {
          this.transitioningOpen = true;
          this.syncedHeight = false;
          this.expandRaf();
        } else {
          shouldAdjust = true;
          this.transitioningClosed = true;
          this.collapseRaf();
        }
      }
    } else if (nextProps.open !== this.props.open) {
      if (nextProps.open) {
        this.transitioningOpen = true;
        this.syncedHeight = false;
        this.expandRaf();
      } else {
        shouldAdjust = true;
        this.transitioningClosed = true;
        this.collapseRaf();
      }
    }

    if (shouldAdjust) {
      this.syncMaxHeight();
    }
  }

  componentWillUnmount() {
    this.tearDownHandlers();
  }

  syncMaxHeight() {
    this.syncHeightCallback = window.requestAnimationFrame(() => {
      this.contentHeight = this.content.scrollHeight;
      this.syncedHeight = true;
      this.forceUpdate();
    });
  }

  collapseRaf() {
    if (this.collapseCallback) { // if there's a collapse in progress, let it finish...
      this.transitioningClosed = false;
      return;
    }
    this.transitioningOpen = false;
    this.collapseCallback = window.requestAnimationFrame(() => {
      this.content.style.maxHeight = `${this.contentHeight}px`;
      window.cancelAnimationFrame(this.collapseCallback);
      this.collapseCallback = window.requestAnimationFrame(() => {
        this.content.style.maxHeight = '0';
        window.cancelAnimationFrame(this.collapseCallback);
        this.collapseCallback = null;
      });
    });
  }

  expandRaf() {
    if (this.expandCallback) {
      this.transitioningOpen = false;
      return;
    }
    this.transitioningClosed = false;
    this.expandCallback = window.requestAnimationFrame(() => {
      this.content.style.maxHeight = `${this.contentHeight}px`;
      window.cancelAnimationFrame(this.expandCallback);
      this.expandCallback = null;
    });
  }

  initializeAccordion() {
    // if no 'open' boolean or 'id' prop is provided, set up our own state...
    if (this.props.open === undefined && this.props.id === undefined) {
      return { isOpen: true };
    }
    return {};
  }

  initializeContentId() {
    // generate unique id if no id is provided.
    if (this.props.contentId === undefined) {
      this.contentId = uniqueId('accordion');
    } else {
      this.contentId = this.props.contentId;
    }
  }

  tearDownHandlers() {
    window.cancelAnimationFrame(this.syncHeightCallback);
    window.cancelAnimationFrame(this.expandCallback);
    window.cancelAnimationFrame(this.collapseCallback);
  }

  uncontrolledToggle() {
    this.setState((curState) => {
      const newState = curState;
      newState.isOpen = !curState.isOpen;
      return newState;
    });
  }

  setContentRef(ref) {
    this.content = ref;
    if (this.props.contentRef) {
      this.props.contentRef(ref);
    }
  }

  handleTransitionEnd() {
    if (this.transitioningOpen) {
      this.transitioningOpen = false;
      this.content.style.maxHeight = 'none';
    }
    if (this.transitioningClosed) {
      this.transitioningClosed = false;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getContentClass(open) {
    return classNames(
      css.content,
      { [`${css.expanded}`]: open },
    );
  }

  render() {
    let open;
    if (this.props.open !== undefined) {
      open = this.props.open;
    } else {
      open = this.state.isOpen;
    }

    let onToggle;
    if (this.props.onToggle && this.props.open !== undefined) {
      onToggle = this.props.onToggle;
    } else {
      onToggle = this.uncontrolledToggle;
    }

    const headerProps = Object.assign({}, this.props, { contentId: this.contentId, toggleRef: (ref) => { this.toggle = ref; }, open, onToggle });
    const headerElement = React.createElement(this.props.header, headerProps);

    return (
      <section id={this.props.id} className={css.root} >
        <HotKeys keyMap={this.props.toggleKeyMap} handlers={this.props.toggleKeyHandlers} noWrapper >
          {headerElement}
        </HotKeys>
        <div
          className={this.getContentClass(open)}
          ref={this.setContentRef}
          role="tabpanel"
          id={this.contentId}
          onTransitionEnd={this.handleTransitionEnd}
        >
          {this.props.children}
        </div>
        {this.props.separator && <div className={css.separator} />}
      </section>
    );
  }
}

Accordion.propTypes = propTypes;

export default Accordion;
