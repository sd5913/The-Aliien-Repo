import home from "../../../images/icon/home.svg";
import my from "../../../images/icon/my.svg";
import setting from "../../../images/icon/setting.svg";
import plus from "../../../images/icon/plus.svg";
import edit from "../../../images/icon/edit.svg";
import share from "../../../images/icon/share.svg";
import exportIcon from "../../../images/icon/export.svg";
import finished from "../../../images/icon/finished.svg";
import bin from "../../../images/icon/bin.svg";
import heart from "../../../images/icon/heart.svg";
import chevronDown from "../../../images/icon/chevron-down.svg";
import chevronLeft from "../../../images/icon/chevron-left.svg";
import chevronRight from "../../../images/icon/chevron-right.svg";
import chevronUp from "../../../images/icon/chevron-up.svg";
import camera from "../../../images/icon/camera.svg";
import person from "../../../images/icon/person.svg";
import key from "../../../images/icon/key.svg";
import globe from "../../../images/icon/globe.svg";
import version from "../../../images/icon/version.svg";
import changelog from "../../../images/icon/changelog.svg";
import bell from "../../../images/icon/bell.svg";
import binAlert from "../../../images/icon/bin-alert.svg";
import google from "../../../images/icon/google.svg";
import github from "../../../images/icon/github.svg";
import apple from "../../../images/icon/apple.svg";
import feedback from "../../../images/icon/feedback.svg";

const icons = { home, my, setting, plus, edit, share, export: exportIcon, finished, bin, heart, chevronDown, chevronLeft, chevronRight, chevronUp, camera, person, key, globe, version, changelog, bell, binAlert, google, github, apple, feedback };

export function AppIcon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  return <img className="app-icon" src={icons[name]} width={size} height={size} alt="" aria-hidden="true" draggable={false} />;
}
