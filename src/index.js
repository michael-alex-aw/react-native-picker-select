import { Picker } from '@react-native-picker/picker';
import isEqual from 'lodash.isequal';
import isObject from 'lodash.isobject';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Keyboard, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { defaultStyles } from './styles';

export default class RNPickerSelect extends PureComponent {
  static propTypes = {
    onValueChange: PropTypes.func.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.any.isRequired,
        testID: PropTypes.string,
        inputLabel: PropTypes.string,
        key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        color: PropTypes.string,
      })
    ).isRequired,
    value: PropTypes.any,
    placeholder: PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.any,
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      color: PropTypes.string,
    }),
    disabled: PropTypes.bool,
    itemKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    style: PropTypes.shape({}),
    children: PropTypes.any,
    onOpen: PropTypes.func,
    useNativeAndroidPickerStyle: PropTypes.bool,
    fixAndroidTouchableBug: PropTypes.bool,
    darkTheme: PropTypes.bool,

    // Custom Modal props (iOS only)
    doneText: PropTypes.string,
    onDonePress: PropTypes.func,
    onUpArrow: PropTypes.func,
    onDownArrow: PropTypes.func,
    onClose: PropTypes.func,

    // Modal props (iOS only)
    modalProps: PropTypes.shape({}),

    // TextInput props
    textInputProps: PropTypes.shape({}),

    // Picker props
    pickerProps: PropTypes.shape({}),

    // Touchable Done props (iOS only)
    touchableDoneProps: PropTypes.shape({}),

    // Touchable wrapper props
    touchableWrapperProps: PropTypes.shape({}),

    // Custom Icon
    Icon: PropTypes.func,
    InputAccessoryView: PropTypes.func,
    customStyle: PropTypes.bool, // From HEAD
    dropdownItemStyle: PropTypes.shape({}), // From upstream/master
    activeItemStyle: PropTypes.shape({}), // From upstream/master
  };

  static defaultProps = {
    value: undefined,
    placeholder: {
      label: 'Select an item...',
      value: null,
      color: '#9EA0A4',
    },
    disabled: false,
    itemKey: null,
    style: {},
    children: null,
    useNativeAndroidPickerStyle: true,
    fixAndroidTouchableBug: false,
    doneText: 'Done',
    onDonePress: null,
    onUpArrow: null,
    onDownArrow: null,
    onOpen: null,
    onClose: null,
    modalProps: {},
    textInputProps: {},
    pickerProps: {},
    touchableDoneProps: {},
    touchableWrapperProps: {},
    Icon: null,
    InputAccessoryView: null,
    darkTheme: false, // From upstream/master
    dropdownItemStyle: {}, // From upstream/master
    activeItemStyle: {}, // From upstream/master
    customStyle: false, // From HEAD
  };

  // From upstream/master
  static handlePlaceholder({ placeholder }) {
    if (isEqual(placeholder, {})) {
      return [];
    }
    return [placeholder];
  }

  // From upstream/master
  static getSelectedItem({ items, key, value }) {
    let idx = items.findIndex((item) => {
      if (item.key && key) {
        return isEqual(item.key, key);
      }
      if (isObject(item.value) || isObject(value)) {
        return isEqual(item.value, value);
      }
      // convert to string to make sure types match
      return isEqual(String(item.value), String(value));
    });
    if (idx === -1) {
      idx = 0;
    }
    return {
      selectedItem: items[idx] || {},
      idx,
    };
  }

  constructor(props) {
    super(props);

    // Adopted from upstream/master for better state initialization
    const items = RNPickerSelect.handlePlaceholder({
      placeholder: props.placeholder,
    }).concat(props.items);

    const { selectedItem } = RNPickerSelect.getSelectedItem({
      items,
      key: props.itemKey,
      value: props.value,
    });

    this.state = {
      items,
      selectedItem,
      showPicker: false,
      animationType: undefined,
      orientation: 'portrait',
      doneDepressed: false,
    };

    // Bindings from upstream/master
    this.onUpArrow = this.onUpArrow.bind(this);
    this.onDownArrow = this.onDownArrow.bind(this);
    this.onValueChange = this.onValueChange.bind(this);
    this.onOrientationChange = this.onOrientationChange.bind(this);
    this.setInputRef = this.setInputRef.bind(this);
    this.togglePicker = this.togglePicker.bind(this);
    this.renderInputAccessoryView = this.renderInputAccessoryView.bind(this);
  }

  // Adopted from upstream/master for comprehensive updates
  componentDidUpdate = (prevProps, prevState) => {
    // update items if items or placeholder prop changes
    const items = RNPickerSelect.handlePlaceholder({
      placeholder: this.props.placeholder,
    }).concat(this.props.items);
    const itemsChanged = !isEqual(prevState.items, items);

    // update selectedItem if value prop is defined and differs from currently selected item
    const { selectedItem, idx } = RNPickerSelect.getSelectedItem({
      items,
      key: this.props.itemKey,
      value: this.props.value,
    });
    const selectedItemChanged =
      !isEqual(this.props.value, undefined) && !isEqual(prevState.selectedItem, selectedItem);

    if (itemsChanged || selectedItemChanged) {
      this.props.onValueChange(selectedItem.value, idx);

      this.setState({
        ...(itemsChanged ? { items } : {}),
        ...(selectedItemChanged ? { selectedItem } : {}),
      });
    }
  };

  onUpArrow() {
    const { onUpArrow } = this.props;
    this.togglePicker(false, onUpArrow);
  }

  onDownArrow() {
    const { onDownArrow } = this.props;
    this.togglePicker(false, onDownArrow);
  }

  onValueChange(value, index) {
    const { onValueChange } = this.props;

    onValueChange(value, index);

    this.setState((prevState) => {
      return {
        selectedItem: prevState.items[index],
      };
    });
  }

  onOrientationChange({ nativeEvent }) {
    this.setState({
      orientation: nativeEvent.orientation,
    });
  }

  setInputRef(ref) {
    this.inputRef = ref;
  }

  getPlaceholderStyle() {
    const { placeholder, style } = this.props;
    const { selectedItem } = this.state;

    if (!isEqual(placeholder, {}) && selectedItem.label === placeholder.label) {
      return {
        ...defaultStyles.placeholder,
        ...style.placeholder,
      };
    }
    return {};
  }

  // From upstream/master
  isDarkTheme() {
    const { darkTheme } = this.props;
    return Platform.OS === 'ios' && darkTheme;
  }

  // From upstream/master (with donePressed parameter)
  triggerOpenCloseCallbacks(donePressed) {
    const { onOpen, onClose } = this.props;
    const { showPicker } = this.state;

    if (!showPicker && onOpen) {
      onOpen();
    }

    if (showPicker && onClose) {
      onClose(donePressed);
    }
  }

  // Adopted from upstream/master (with donePressed parameter)
  togglePicker(animate = false, postToggleCallback, donePressed = false) {
    const { modalProps, disabled } = this.props;
    const { showPicker } = this.state;

    if (disabled) {
      return;
    }

    if (!showPicker) {
      Keyboard.dismiss();
    }

    const animationType =
      modalProps && modalProps.animationType ? modalProps.animationType : 'slide';

    this.triggerOpenCloseCallbacks(donePressed);

    this.setState(
      (prevState) => {
        return {
          animationType: animate ? animationType : undefined,
          showPicker: !prevState.showPicker,
        };
      },
      () => {
        if (postToggleCallback) {
          postToggleCallback();
        }
      }
    );
  }

  renderPickerItems() {
    const { items, selectedItem } = this.state;
    const defaultItemColor = this.isDarkTheme() ? '#fff' : undefined; // From upstream/master

    const { dropdownItemStyle, activeItemStyle } = this.props; // From upstream/master

    return items.map((item) => {
      return (
        <Picker.Item
          style={selectedItem.value === item.value ? activeItemStyle : dropdownItemStyle} // From upstream/master
          label={item.label}
          value={item.value}
          key={item.key || item.label}
          color={item.color || defaultItemColor} // From upstream/master (with dark theme support)
          // backgroundColor={item.backgroundColor} // This was in HEAD, but typically Picker.Item doesn't directly support backgroundColor style in this way cross-platform. Prefer 'color' for text color. If a specific background is needed, it's often handled by parent styles or custom Picker component. Removed for upstream compatibility.
          testID={item.testID} // From upstream/master
        />
      );
    });
  }

  renderInputAccessoryView() {
    const {
      InputAccessoryView,
      doneText,
      onUpArrow,
      onDownArrow,
      onDonePress,
      style,
      touchableDoneProps,
    } = this.props;

    const { doneDepressed } = this.state;

    if (InputAccessoryView) {
      return <InputAccessoryView testID="custom_input_accessory_view" />;
    }

    // Adopted from upstream/master with dark theme and structured chevrons
    return (
      <View
        style={[
          defaultStyles.modalViewMiddle,
          this.isDarkTheme() ? defaultStyles.modalViewMiddleDark : {},
          this.isDarkTheme() ? style.modalViewMiddleDark : style.modalViewMiddle,
        ]}
        testID="input_accessory_view"
      >
        <View style={[defaultStyles.chevronContainer, style.chevronContainer]}>
          <TouchableOpacity
            activeOpacity={onUpArrow ? 0.5 : 1}
            onPress={onUpArrow ? this.onUpArrow : null}
          >
            <View
              style={[
                defaultStyles.chevron,
                this.isDarkTheme() ? defaultStyles.chevronDark : {},
                this.isDarkTheme() ? style.chevronDark : style.chevron,
                defaultStyles.chevronUp,
                style.chevronUp,
                onUpArrow ? [defaultStyles.chevronActive, style.chevronActive] : {},
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={onDownArrow ? 0.5 : 1}
            onPress={onDownArrow ? this.onDownArrow : null}
          >
            <View
              style={[
                defaultStyles.chevron,
                this.isDarkTheme() ? defaultStyles.chevronDark : {},
                this.isDarkTheme() ? style.chevronDark : style.chevron,
                defaultStyles.chevronDown,
                style.chevronDown,
                onDownArrow ? [defaultStyles.chevronActive, style.chevronActive] : {},
              ]}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          testID="done_button"
          onPress={() => {
            this.togglePicker(true, onDonePress, true);
          }}
          onPressIn={() => {
            this.setState({ doneDepressed: true });
          }}
          onPressOut={() => {
            this.setState({ doneDepressed: false });
          }}
          hitSlop={{
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
          }}
          {...touchableDoneProps}
        >
          <View testID="needed_for_touchable">
            <Text
              testID="done_text"
              allowFontScaling={false}
              style={[
                defaultStyles.done,
                this.isDarkTheme() ? defaultStyles.doneDark : {},
                this.isDarkTheme() ? style.doneDark : style.done,
                doneDepressed ? [defaultStyles.doneDepressed, style.doneDepressed] : {},
              ]}
            >
              {doneText}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  renderIcon() {
    const { style, Icon } = this.props;

    if (!Icon) {
      return null;
    }

    return (
      <View testID="icon_container" style={[defaultStyles.iconContainer, style.iconContainer]}>
        <Icon testID="icon" />
      </View>
    );
  }

  renderTextInputOrChildren() {
    const { children, style, textInputProps } = this.props;
    const { selectedItem } = this.state;

    // Adopted from upstream/master with pointerEvents for proper touch handling
    const containerStyle =
      Platform.OS === 'ios' ? style.inputIOSContainer : style.inputAndroidContainer;

    if (children) {
      return (
        <View pointerEvents="box-only" style={containerStyle}>
          {children}
        </View>
      );
    }

    return (
      <View pointerEvents="box-only" style={containerStyle}>
        <TextInput
          testID="text_input"
          style={[
            Platform.OS === 'ios' ? style.inputIOS : style.inputAndroid,
            this.getPlaceholderStyle(),
          ]}
          value={selectedItem.inputLabel ? selectedItem.inputLabel : selectedItem.label}
          ref={this.setInputRef}
          editable={false}
          {...textInputProps}
        />
        {this.renderIcon()}
      </View>
    );
  }

  // Adopted from upstream/master (includes dark theme styling in modal)
  renderIOS() {
    const { style, modalProps, pickerProps, touchableWrapperProps } = this.props;
    const { animationType, orientation, selectedItem, showPicker } = this.state;

    return (
      <View style={[defaultStyles.viewContainer, style.viewContainer]}>
        <TouchableOpacity
          testID="ios_touchable_wrapper"
          onPress={() => {
            this.togglePicker(true);
          }}
          activeOpacity={1}
          {...touchableWrapperProps}
        >
          {this.renderTextInputOrChildren()}
        </TouchableOpacity>
        <Modal
          testID="ios_modal"
          visible={showPicker}
          transparent
          animationType={animationType}
          supportedOrientations={['portrait', 'landscape']}
          onOrientationChange={this.onOrientationChange}
          {...modalProps}
        >
          <TouchableOpacity
            style={[defaultStyles.modalViewTop, style.modalViewTop]}
            testID="ios_modal_top"
            onPress={() => {
              this.togglePicker(true);
            }}
          />
          {this.renderInputAccessoryView()}
          <View
            style={[
              defaultStyles.modalViewBottom,
              this.isDarkTheme() ? defaultStyles.modalViewBottomDark : {},
              { height: orientation === 'portrait' ? 215 : 162 },
              this.isDarkTheme() ? style.modalViewBottomDark : style.modalViewBottom,
            ]}
          >
            <Picker
              testID="ios_picker"
              onValueChange={this.onValueChange}
              selectedValue={selectedItem.value}
              {...pickerProps}
            >
              {this.renderPickerItems()}
            </Picker>
          </View>
        </Modal>
      </View>
    );
  }

  renderAndroidHeadless() {
    const {
      disabled,
      Icon,
      style,
      pickerProps,
      onOpen,
      touchableWrapperProps,
      fixAndroidTouchableBug,
      customStyle, // Using customStyle prop from HEAD if it defines additional styling
    } = this.props;
    const { selectedItem } = this.state;

    const Component = fixAndroidTouchableBug ? View : TouchableOpacity;
    return (
      <Component
        testID="android_touchable_wrapper"
        onPress={onOpen}
        activeOpacity={1}
        {...touchableWrapperProps}
      >
        <View style={style.headlessAndroidContainer}>
          {this.renderTextInputOrChildren()}
          <Picker
            style={[
              Icon ? { backgroundColor: 'transparent' } : {}, // to hide native icon
              defaultStyles.headlessAndroidPicker,
              style.headlessAndroidPicker,
              // Merging customStyle from HEAD if applicable, but note that Picker styles can be tricky
              customStyle && {
                width: "10%",
                height: "100%",
                backgroundColor: "transparent",
                opacity: 1,
                alignSelf: "flex-end"
              },
            ]}
            testID="android_picker_headless"
            enabled={!disabled}
            onValueChange={this.onValueChange}
            selectedValue={selectedItem.value}
            {...pickerProps}
            dropdownIconColor={customStyle ? "white" : undefined} // Example: only apply if customStyle is true
            dropdownIconRippleColor={customStyle ? 'white' : undefined} // Example: only apply if customStyle is true
          >
            {this.renderPickerItems()}
          </Picker>
        </View>
      </Component>
    );
  }

  // From upstream/master
  renderAndroidNativePickerStyle() {
    const { disabled, Icon, style, pickerProps } = this.props;
    const { selectedItem } = this.state;

    return (
      <View style={[defaultStyles.viewContainer, style.viewContainer]}>
        <Picker
          style={[
            Icon ? { backgroundColor: 'transparent' } : {}, // to hide native icon
            style.inputAndroid,
            this.getPlaceholderStyle(),
          ]}
          testID="android_picker"
          enabled={!disabled}
          onValueChange={this.onValueChange}
          selectedValue={selectedItem.value}
          {...pickerProps}
        >
          {this.renderPickerItems()}
        </Picker>
        {this.renderIcon()}
      </View>
    );
  }

  // From upstream/master
  renderWeb() {
    const { disabled, style, pickerProps } = this.props;
    const { selectedItem } = this.state;

    return (
      <View style={[defaultStyles.viewContainer, style.viewContainer]}>
        <Picker
          style={[style.inputWeb]}
          testID="web_picker"
          enabled={!disabled}
          onValueChange={this.onValueChange}
          selectedValue={selectedItem.value}
          {...pickerProps}
        >
          {this.renderPickerItems()}
        </Picker>
        {this.renderIcon()}
      </View>
    );
  }

  // Adopted from upstream/master for platform handling
  render() {
    const { children, useNativeAndroidPickerStyle } = this.props;

    if (Platform.OS === 'ios') {
      return this.renderIOS();
    }

    if (Platform.OS === 'web') {
      return this.renderWeb();
    }

    if (children || !useNativeAndroidPickerStyle) {
      return this.renderAndroidHeadless();
    }

    return this.renderAndroidNativePickerStyle();
  }
}

export { defaultStyles };