import React from 'react';
import className from 'classnames';
import PropTypes from 'prop-types';
import css from './Button.css';
import omitProps from '../../util/omitProps';

const propTypes = {
  buttonStyle: PropTypes.string,
  type: PropTypes.string,
  buttonClass: PropTypes.string,
  bsRole: PropTypes.string,
  bsClass: PropTypes.string,
  hollow: PropTypes.bool,
  align: PropTypes.string,
  className: PropTypes.string,
  bottomMargin0: PropTypes.bool,
  marginBottom0: PropTypes.bool,
  fullWidth: PropTypes.bool,
  href: PropTypes.string,
  allowAnchorClick: PropTypes.bool,
  onClick: PropTypes.func,
  role: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
  buttonRef: PropTypes.func,
};

const defaultProps = {
  buttonStyle: 'primary',
  type: 'button',
  role: 'button',
};

function Button(props) {
  function getStyle() {
    const buttonBuiltIn = [];
    if (!props.className) {
      if (/\s/.test(props.buttonStyle)) {
        const csslist = props.buttonStyle.split(/\s+/);
        csslist.forEach((classname) => { buttonBuiltIn.push(css[classname]); });
      } else {
        buttonBuiltIn.push(css[props.buttonStyle]);
      }
      return className(
        css.button,
        buttonBuiltIn,
        { [`${css.marginBottom0}`]: props.marginBottom0 },
        { [`${css.marginBottom0}`]: props.bottomMargin0 },
        { [`${css.fullWidth}`]: props.fullWidth },
        { [`${css.hollow}`]: props.hollow },
        { [`${css.floatEnd}`]: props.align === 'end' },
      );
    }
    return props.className;
  }

  function handleAnchorClick(e) {
    if (e && !props.allowAnchorClick) e.preventDefault();
    props.onClick(e);
  }

  function getButtonRef(ref) {
    if (props.buttonRef) {
      props.buttonRef(ref);
    }
  }

  const inputCustom = omitProps(props, ['buttonStyle', 'bottomMargin0', 'marginBottom0', 'align', 'hollow', 'fullWidth', 'bsRole', 'bsClass', 'onClick', 'allowAnchorClick', 'buttonRef']);
  const { children, onClick, type } = props;

  if (props.href) {
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <a className={getStyle()} onClick={handleAnchorClick} ref={getButtonRef} {...inputCustom}>
        {children}
      </a>
    );
  }

  return (
    <button className={getStyle()} type={type} onClick={onClick} ref={getButtonRef} {...inputCustom}>
      {children}
    </button>
  );
}

Button.propTypes = propTypes;
Button.defaultProps = defaultProps;

export default Button;
