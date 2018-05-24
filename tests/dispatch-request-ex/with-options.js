export const fromApi = response => {
	if ( ! response.data ) {
		throw new Error( 'missing settings' );
	}

	return normalizeSettings( response.data );
};

const toApi = settings => filterSettingsByActiveModules( sanitizeSettings( settings ) );

const receiveJetpackOnboardingSettings = ( { dispatch }, { siteId }, settings ) => {
	dispatch( updateJetpackSettings( siteId, settings ) );
};
export const requestJetpackSettings = ( { dispatch }, action ) => {
	const { siteId, query } = action;

	return dispatch(
		http(
			{
				apiVersion: '1.1',
				method: 'GET',
				path: '/jetpack-blogs/' + siteId + '/rest-api/',
				query: {
					path: '/jetpack/v4/settings/',
					query: JSON.stringify( query ),
					json: true,
				},
			},
			action
		)
	);
};

export const announceRequestFailure = ( { dispatch, getState }, { siteId } ) => {
	const state = getState();
	const url = getSiteUrl( state, siteId ) || getUnconnectedSiteUrl( state, siteId );
	const noticeOptions = {
		id: `jpo-communication-error-${ siteId }`,
	};

	if ( url ) {
		noticeOptions.button = translate( 'Visit site admin' );
		noticeOptions.href = trailingslashit( url ) + 'wp-admin/admin.php?page=jetpack';
	}

	return dispatch( errorNotice( translate( 'Something went wrong.' ), noticeOptions ) );
};

dispatchRequest( requestJetpackSettings, receiveJetpackOnboardingSettings, announceRequestFailure, {
	fromApi,
} );
