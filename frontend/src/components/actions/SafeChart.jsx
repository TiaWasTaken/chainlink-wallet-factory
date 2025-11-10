import React from "react";

export class SafeChart extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("🔥 Chart crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-400 text-sm p-2 text-center bg-[#1f1f2d] rounded-md">
          Chart unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

